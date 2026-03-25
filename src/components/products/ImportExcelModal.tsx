import { useState } from 'react';
import * as xlsx from 'xlsx';
import { supabase } from '@/lib/supabase';
import { useProductsStore } from '@/stores/productsStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ImportExcelModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ImportExcelModal({ isOpen, onClose }: ImportExcelModalProps) {
    const { fetchProducts, products } = useProductsStore();
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState<string>('');
    const [result, setResult] = useState<{ total: number, new: number, skipped: number } | null>(null);

    const handleImport = async () => {
        setIsImporting(true);
        setResult(null);
        setProgress('Iniciando importação...');

        const fileConfigs = [
            {
                url: '/frutas_organicas_top20_erp.xlsx',
                name: 'Frutas (20 itens)',
                map: (row: any) => ({
                    name: row['Nome do Produto'],
                    description: row['Descrição'] || '',
                    category: row['Categoria'] || 'Frutas',
                    image_url: row['URL da Imagem'] || null,
                })
            },
            {
                url: '/hortifruti_organico_top50.xlsx',
                name: 'Hortifruti (50 itens)',
                map: (row: any) => ({
                    name: row['Nome do Produto'],
                    description: row['Descrição'] || '',
                    category: row['Categoria Principal'] || 'Outros',
                    image_url: row['URL da Imagem'] || null,
                })
            },
            {
                url: '/produtos_korin_completo.xlsx',
                name: 'Produtos Korin (20 itens)',
                map: (row: any) => ({
                    name: row['Nome do Produto'],
                    description: '', // Korin may not have description
                    category: row['Categoria Principal'] || 'Outros',
                    image_url: row['URL da Imagem'] || null,
                })
            },
            {
                url: '/produtos_native_organicos.xlsx',
                name: 'Produtos Native (20 itens)',
                map: (row: any) => ({
                    name: row['Nome do Produto'],
                    description: '', // Native may not have description
                    category: row['Categoria'] || 'Outros',
                    image_url: row['URL da Imagem'] || null,
                })
            }
        ];

        try {
            let totalProducts: any[] = [];
            const existingNames = new Set(products.map(p => p.name.trim().toLowerCase()));

            for (const config of fileConfigs) {
                setProgress(`Baixando e analisando ${config.name}...`);
                try {
                    const response = await fetch(config.url);
                    if (!response.ok) {
                        console.warn(`Arquivo não encontrado: ${config.url}`);
                        continue;
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    const workbook = xlsx.read(arrayBuffer, { type: 'buffer' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const jsonData = xlsx.utils.sheet_to_json(sheet);
                    
                    for (const row of jsonData) {
                        // Skip if it doesn't look like a product row
                        if (!row['Nome do Produto']) continue;
                        
                        const mapped = config.map(row);
                        
                        // Ignore already existing products or duplicates in this file
                        if (!existingNames.has(mapped.name.trim().toLowerCase())) {
                            existingNames.add(mapped.name.trim().toLowerCase());
                            totalProducts.push(mapped);
                        }
                    }
                } catch (err) {
                    console.error(`Erro ao processar ${config.name}:`, err);
                }
            }

            setProgress(`Preparando para importar ${totalProducts.length} produtos novos...`);

            if (totalProducts.length === 0) {
                setResult({ total: 0, new: 0, skipped: 0 });
                setIsImporting(false);
                return;
            }

            // Determine the next internal code based on existing database content
            const { data: allCurrent } = await supabase.from('products').select('internal_code');
            const maxCode = (allCurrent || []).reduce((max, p) => {
                const num = parseInt(p.internal_code, 10);
                return !isNaN(num) && num > max ? num : max;
            }, 0);

            let currentCodeInt = maxCode;

            // Prepare batch insert
            const batchInserts = totalProducts.map((p) => {
                currentCodeInt += 1;
                return {
                    internal_code: String(currentCodeInt).padStart(4, '0'),
                    name: p.name,
                    description: p.description,
                    category: p.category,
                    price: 0, // Manual as per user spec
                    cost_price: 0,
                    stock_qty: 0, // Manual as per user spec
                    image_url: p.image_url,
                    is_active: true,
                    show_in_catalog: true,
                    feature_badge: 'none'
                };
            });

            setProgress('Enviando produtos para o banco de dados... (pode levar alguns segundos)');

            // We do bulk insert in chunks if needed, but 100-200 is small enough for a single request
            const { error } = await supabase.from('products').insert(batchInserts);

            if (error) {
                throw error;
            }

            setProgress('Importação concluída com sucesso!');
            setResult({
                total: totalProducts.length,
                new: totalProducts.length,
                skipped: 0 // Skipped handled locally by Set
            });

            // Reload products in the global store
            await fetchProducts();

        } catch (error: any) {
            console.error('Erro geral de importação:', error);
            setProgress(`Erro: ${error.message}`);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Importação em Lote via Excel" size="md">
            <div className="space-y-6">
                <div className="p-4 bg-blue-50 text-blue-800 rounded-lg flex items-start gap-3">
                    <FileSpreadsheet className="shrink-0 mt-0.5" size={20} />
                    <div className="text-sm">
                        <p className="font-semibold mb-1">Upload das Planilhas Lattuga</p>
                        <p>
                            Este robô irá ler os 4 arquivos Excel presentes na pasta do sistema
                            (Frutas, Hortifruti, Korin e Native) e adicionar os produtos automaticamente.
                        </p>
                        <ul className="list-disc mt-2 ml-4 space-y-1">
                            <li>O <b>Preço</b> e <b>Estoque</b> serão definidos como 0, pois você solicitou gestão manual posterior.</li>
                            <li>Apenas produtos novos serão adicionados, evitando duplicações.</li>
                        </ul>
                    </div>
                </div>

                {progress && !result && (
                    <div className="text-center p-4 bg-gray-50 rounded-lg animate-pulse text-sm text-gray-600 font-medium">
                        {progress}
                    </div>
                )}

                {result && (
                    <div className="p-4 bg-green-50 text-green-800 rounded-lg text-center flex flex-col items-center gap-2">
                        <CheckCircle2 size={32} className="text-green-600" />
                        <span className="font-bold text-lg">Importação Finalizada!</span>
                        <span className="text-sm">
                            {result.new} novos produtos castrados no catálogo.
                        </span>
                    </div>
                )}

                <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                    <Button variant="ghost" onClick={onClose} disabled={isImporting}>
                        Fechar
                    </Button>
                    {!result && (
                        <Button 
                            onClick={handleImport} 
                            isLoading={isImporting}
                            leftIcon={<FileSpreadsheet size={18} />}
                        >
                           Iniciar Importação Lattuga
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
}

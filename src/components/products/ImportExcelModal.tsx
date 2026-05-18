import { useState, useRef } from 'react';
import * as xlsx from 'xlsx';
import { useProductsStore } from '@/stores/productsStore';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FileSpreadsheet, CheckCircle2, Download, Upload, AlertCircle } from 'lucide-react';
import type { Product } from '@/types';

interface ImportExcelModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ParsedData {
    updates: { id: string; changes: Partial<Product> }[];
    creates: Omit<Product, 'id' | 'internal_code' | 'created_at' | 'updated_at'>[];
}

export function ImportExcelModal({ isOpen, onClose }: ImportExcelModalProps) {
    const { fetchProducts, products, bulkUpdateProducts, bulkCreateProducts } = useProductsStore();
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [result, setResult] = useState<{ totalFound: number, updated: number, created: number, removed: number } | null>(null);
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const [syncDeletions, setSyncDeletions] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const downloadDatabase = () => {
        const headers = [
            "ID_SISTEMA_NAO_ALTERAR",
            "Nome do Produto",
            "Categoria",
            "Descrição",
            "Preço de Custo (R$)",
            "Preço de Venda (R$)",
            "Fornecedor",
            "Produto Embalado (Sim/Não)",
            "Ativo (Sim/Não)",
            "URL da Imagem (Opcional)"
        ];
        
        const rows = products.map(p => [
            p.id,
            p.name,
            p.category,
            p.description || '',
            p.cost_price?.toString().replace('.', ',') || '0',
            p.price?.toString().replace('.', ',') || '0',
            p.supplier_name || '',
            p.is_packaged ? "Sim" : "Não",
            p.is_active ? "Sim" : "Não",
            p.image_url || ''
        ]);
        
        const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
        
        // Auto-size columns to look more professional
        ws['!cols'] = [
            { wch: 35 }, // ID
            { wch: 30 }, // Nome do Produto
            { wch: 20 }, // Categoria
            { wch: 45 }, // Descrição
            { wch: 20 }, // Preço de Custo 
            { wch: 20 }, // Preço de Venda
            { wch: 25 }, // Fornecedor
            { wch: 25 }, // Produto Embalado
            { wch: 15 }, // Ativo
            { wch: 40 }, // URL da Imagem
        ];

        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Base_Produtos");
        
        xlsx.writeFile(wb, "cadastro_lattuga_atualizado.xlsx");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError('');
        setResult(null);
        setParsedData(null);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = xlsx.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = xlsx.utils.sheet_to_json(ws) as any[];

                if (data.length === 0) {
                    setError('A planilha está vazia.');
                    return;
                }

                const updates: { id: string; changes: Partial<Product> }[] = [];
                const creates: Omit<Product, 'id' | 'internal_code' | 'created_at' | 'updated_at'>[] = [];
                
                data.forEach((row) => {
                    const id = row['ID_SISTEMA_NAO_ALTERAR'] || row['CODIGO'];
                    const name = row['Nome do Produto'] || row['PRODUTO'];
                    
                    if (!name && !id) return; // Skip entirely empty rows

                    const parseMoney = (val: any) => {
                        if (typeof val === 'number') return val;
                        if (!val) return 0;
                        const strVal = String(val).replace('R$', '').trim().replace(',', '.');
                        const num = parseFloat(strVal);
                        return isNaN(num) ? 0 : num;
                    };

                    const parseBoolean = (val: any) => {
                        const strVal = String(val || '').toLowerCase();
                        return strVal.includes('sim') || strVal === 's' || strVal === 'true';
                    };

                    const category = String(row['Categoria'] || row['CATEGORIA'] || '').trim();
                    const description = String(row['Descrição'] || row['DESCRIÇÃO'] || '').trim();
                    const supplier_name = String(row['Fornecedor'] || row['FORNECEDOR'] || '').trim();
                    const cost_price = parseMoney(row['Preço de Custo (R$)'] !== undefined ? row['Preço de Custo (R$)'] : row['CUSTO']);
                    const price = parseMoney(row['Preço de Venda (R$)'] !== undefined ? row['Preço de Venda (R$)'] : row['VL VENDA']);
                    const is_packaged = parseBoolean(row['Produto Embalado (Sim/Não)'] !== undefined ? row['Produto Embalado (Sim/Não)'] : row['Embalado (Sim/Não)']);
                    // Handles 'Ativo (Sim/Não)' in both sheets
                    const isActiveRaw = row['Ativo (Sim/Não)'];
                    const is_active = parseBoolean(isActiveRaw !== undefined ? isActiveRaw : 'Sim');
                    const image_url = String(row['URL da Imagem (Opcional)'] || row['IMAGEM'] || '').trim();
                    const stock_qty = parseInt(String(row['ESTOQUE'] || row['Estoque'] || '0'), 10) || 0;

                    if (id && String(id).trim() !== '') {
                        // It's an update
                        updates.push({
                            id: String(id).trim(),
                            changes: {
                                ...(name ? { name: String(name).trim() } : {}),
                                ...(category ? { category } : {}),
                                ...(description ? { description } : {}),
                                ...(supplier_name ? { supplier_name } : {}),
                                cost_price,
                                price,
                                is_packaged,
                                is_active,
                                ...(image_url ? { image_url } : {}),
                                stock_qty
                            }
                        });
                    } else if (name) {
                        // It's a create
                        creates.push({
                            name: String(name).trim(),
                            category: category || 'Sem Categoria',
                            description,
                            supplier_code: null,
                            supplier_name: supplier_name || null,
                            cost_price,
                            price,
                            is_packaged,
                            is_active,
                            image_url: image_url || null,
                            stock_qty,
                            show_in_catalog: is_active,
                            feature_badge: 'none'
                        });
                    }
                });

                if (updates.length === 0 && creates.length === 0) {
                    setError('Nenhuma linha válida encontrada na planilha. Verifique se as colunas estão corretas.');
                    return;
                }

                setParsedData({ updates, creates });
                
            } catch (err: any) {
                setError('Erro ao processar o arquivo. Certifique-se que é do formato Excel válido.');
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleImport = async () => {
        if (!parsedData) return;
        
        setIsImporting(true);
        setError('');
        setProgress('Processando produtos na nuvem...');

        try {
            if (parsedData.updates.length > 0) {
                setProgress(`Atualizando ${parsedData.updates.length} produtos...`);
                await bulkUpdateProducts(parsedData.updates);
            }
            if (parsedData.creates.length > 0) {
                setProgress(`Criando ${parsedData.creates.length} novos produtos...`);
                await bulkCreateProducts(parsedData.creates);
            }

            let removedCount = 0;
            if (syncDeletions) {
                setProgress('Sincronizando banco (removendo produtos ausentes)...');
                const allExpectedIds = parsedData.updates.map(u => u.id);
                const allExpectedNames = new Set(parsedData.creates.map(c => c.name.toLowerCase().trim()));
                parsedData.updates.forEach(u => {
                    if (u.changes.name) allExpectedNames.add(u.changes.name.toLowerCase().trim());
                });

                // Add current products names to expected to avoid deleting products that exist but have different ID
                products.forEach(p => {
                    if (allExpectedIds.includes(p.id)) allExpectedNames.add(p.name.toLowerCase().trim());
                });

                const { data: dbProds } = await supabase.from('products').select('id, name');
                const toRemove = dbProds?.filter((p: any) => !allExpectedIds.includes(p.id) && !allExpectedNames.has(p.name.toLowerCase().trim())) || [];

                for (const p of toRemove) {
                    try {
                        const { error: delErr } = await supabase.from('products').delete().eq('id', p.id);
                        if (delErr) throw delErr;
                        removedCount++;
                    } catch (err) {
                        // Fallback: inativar se não puder excluir (tem pedidos)
                        await supabase.from('products').update({ is_active: false, show_in_catalog: false }).eq('id', p.id);
                        removedCount++;
                    }
                }
            }

            setResult({
                totalFound: parsedData.updates.length + parsedData.creates.length,
                updated: parsedData.updates.length,
                created: parsedData.creates.length,
                removed: removedCount
            });
            await fetchProducts(); 
        } catch (err: any) {
            console.error('Erro de importação:', err);
            setError(`Erro ao importar para a Nuvem: ${err.message}`);
        } finally {
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        if (!isImporting) {
            setError('');
            setResult(null);
            setParsedData(null);
            onClose();
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Atualização em Massa via Excel" size="md">
            <div className="space-y-6">
                {!parsedData && !result && (
                    <div className="flex flex-col gap-4">
                        <div className="p-5 bg-brand-50/50 border border-brand-100/50 rounded-2xl flex items-start gap-4 shadow-sm">
                            <div className="bg-brand-100 text-brand-700 p-2 rounded-xl mt-0.5">
                                <FileSpreadsheet size={24} />
                            </div>
                            <div className="text-sm">
                                <p className="font-semibold text-gray-900 mb-1 text-base">Passo a Passo (Ajuste Rápido)</p>
                                <ol className="list-decimal ml-4 space-y-2 mt-2 text-gray-700">
                                    <li>Mantenha o padrão e primeiro clique em <b>Baixar Cadastro Atual</b>.</li>
                                    <li>A planilha virá com todos os produtos. <b>Não modifique a coluna de ID.</b></li>
                                    <li>Altere os preços, nomes e outras informações na planilha diretamente pelo Excel.</li>
                                    <li>Apenas salve a planilha e faça o Upload abaixo (linhas sem ID são ignoradas).</li>
                                </ol>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="mt-5 bg-white border-brand-200 text-brand-700 hover:bg-brand-50 transition-colors shadow-sm w-full font-bold"
                                    onClick={downloadDatabase}
                                    leftIcon={<Download size={16} />}
                                >
                                    Baixar Cadastro Atual (Planilha Inteira)
                                </Button>
                            </div>
                        </div>

                        <div className="border-2 border-dashed border-gray-300 hover:border-brand-400 bg-gray-50/50 rounded-2xl p-10 text-center hover:bg-brand-50/20 transition-all cursor-pointer relative group"
                             onClick={() => fileInputRef.current?.click()}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileUpload} 
                                accept=".xlsx, .xls, .csv" 
                                className="hidden" 
                            />
                            <div className="bg-white group-hover:bg-brand-100 transition-colors w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                                <Upload className="text-gray-400 group-hover:text-brand-600 transition-colors" size={28} />
                            </div>
                            <p className="font-semibold text-gray-800 text-lg">Subir a Planilha Preenchida</p>
                            <p className="text-sm text-gray-500 mt-1">Formatos suportados: .xlsx, .xls</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 text-sm border border-red-100 shadow-sm">
                        <AlertCircle size={20} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {parsedData && !result && !error && (
                    <div className="bg-white border rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 text-brand-600 mb-3">
                            <CheckCircle2 size={28} />
                            <h3 className="font-bold text-xl text-gray-900">Planilha Lida com Sucesso!</h3>
                        </div>
                        <p className="text-gray-600 mb-4 text-sm">
                            Encontramos <strong className="text-gray-900">{parsedData.updates.length}</strong> produtos para atualizar e <strong className="text-gray-900">{parsedData.creates.length}</strong> novos produtos para criar no banco de sistema. Ao prosseguir, o banco refletirá as alterações feitas na planilha silênciosamente, mantendo o controle total da plataforma.
                        </p>

                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6 mt-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={syncDeletions}
                                    onChange={(e) => setSyncDeletions(e.target.checked)}
                                    className="mt-1 w-5 h-5 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                                />
                                <div>
                                    <p className="font-bold text-orange-900 text-sm">Espelhamento Exato (Limpeza)</p>
                                    <p className="text-xs text-orange-700 mt-1">
                                        Se marcado, qualquer produto que estiver no sistema mas <strong>não estiver nesta planilha</strong> será excluído (ou inativado). Use com cuidado para limpar o sistema de produtos antigos.
                                    </p>
                                </div>
                            </label>
                        </div>

                        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button variant="ghost" onClick={handleClose} className="text-gray-500 hover:text-gray-700" disabled={isImporting}>
                                Cancelar
                            </Button>
                            <Button onClick={handleImport} className="min-w-[120px]" isLoading={isImporting} leftIcon={<CheckCircle2 size={18} />}>
                                {isImporting ? progress : 'Atualizar Banco de Dados'}
                            </Button>
                        </div>
                    </div>
                )}

                {result && (
                    <div className="text-center p-6 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4">
                        <div className="mx-auto w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mb-2">
                            <CheckCircle2 size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">Atualização Completa!</h3>
                        <p className="text-gray-600 text-sm max-w-sm mx-auto">
                            Foram alterados <strong className="text-gray-900">{result.updated}</strong> produtos, criados <strong className="text-gray-900">{result.created}</strong> e removidos <strong className="text-gray-900">{result.removed}</strong> produtos com sucesso!
                        </p>
                        <Button 
                            className="mt-6 w-full max-w-[200px]" 
                            onClick={handleClose}
                        >
                            Fechar e Ver Tela
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
}

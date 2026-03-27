import { useState, useRef } from 'react';
import * as xlsx from 'xlsx';
import { supabase } from '@/lib/supabase';
import { useProductsStore } from '@/stores/productsStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FileSpreadsheet, CheckCircle2, Download, Upload, AlertCircle } from 'lucide-react';

interface ImportExcelModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ParsedProduct {
    name: string;
    category: string;
    description: string;
    supplier_name: string;
    cost_price: number;
    price: number;
    is_packaged: boolean;
    image_url: string | null;
}

export function ImportExcelModal({ isOpen, onClose }: ImportExcelModalProps) {
    const { fetchProducts, products } = useProductsStore();
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [result, setResult] = useState<{ total: number, new: number, skipped: number } | null>(null);
    const [parsedData, setParsedData] = useState<ParsedProduct[] | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const downloadTemplate = () => {
        const headers = [
            "Nome do Produto",
            "Categoria",
            "Descrição",
            "Preço de Custo (R$)",
            "Preço de Venda (R$)",
            "Fornecedor",
            "Produto Embalado (Sim/Não)",
            "URL da Imagem (Opcional)"
        ];
        
        const exampleRow = [
            "Morangos Silvestres Orgânicos",
            "Frutas Verdes",
            "Morangos incrivelmente doces e selecionados.",
            "4,50",
            "9,90",
            "Fazenda da Lattuga",
            "Não",
            "https://exemplo.com/foto.jpg"
        ];
        
        const ws = xlsx.utils.aoa_to_sheet([headers, exampleRow]);
        
        // Auto-size columns to look more professional
        ws['!cols'] = [
            { wch: 30 }, // Nome do Produto
            { wch: 20 }, // Categoria
            { wch: 45 }, // Descrição
            { wch: 20 }, // Preço de Custo (R$)
            { wch: 20 }, // Preço de Venda (R$)
            { wch: 25 }, // Fornecedor
            { wch: 25 }, // Produto Embalado (Sim/Não)
            { wch: 40 }, // URL da Imagem
        ];

        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Modelo_Lattuga");
        
        xlsx.writeFile(wb, "modelo_cadastro_lattuga.xlsx");
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

                const validProducts: ParsedProduct[] = [];
                
                data.forEach((row) => {
                    const name = row['Nome do Produto'];
                    const category = row['Categoria'] || 'Outros';
                    
                    if (!name) return; // Ignore empty rows (the user might just scroll in excel)

                    const parseMoney = (val: any) => {
                        if (typeof val === 'number') return val;
                        if (!val) return 0;
                        const strVal = String(val).replace('R$', '').trim().replace(',', '.');
                        const num = parseFloat(strVal);
                        return isNaN(num) ? 0 : num;
                    };

                    const isPackagedStr = String(row['Produto Embalado (Sim/Não)'] || '').toLowerCase();
                    const is_packaged = isPackagedStr.includes('sim') || isPackagedStr === 's' || isPackagedStr === 'true';

                    validProducts.push({
                        name: String(name).trim(),
                        category: String(category).trim(),
                        description: row['Descrição'] ? String(row['Descrição']).trim() : '',
                        supplier_name: row['Fornecedor'] ? String(row['Fornecedor']).trim() : '',
                        cost_price: parseMoney(row['Preço de Custo (R$)']),
                        price: parseMoney(row['Preço de Venda (R$)']),
                        is_packaged,
                        image_url: row['URL da Imagem (Opcional)'] ? String(row['URL da Imagem (Opcional)']).trim() : null
                    });
                });

                if (validProducts.length === 0) {
                    setError('Nenhum produto válido encontrado. Certifique-se de que não removeu o cabeçalho "Nome do Produto".');
                    return;
                }

                setParsedData(validProducts);
                
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
        setProgress('Deduplicando e preparando produtos...');

        try {
            const existingNames = new Set(products.map(p => p.name.trim().toLowerCase()));
            const toInsert: ParsedProduct[] = [];
            const skipped: ParsedProduct[] = [];

            // Simple uniqueness check based on product name case-insensitive
            parsedData.forEach(p => {
                if (existingNames.has(p.name.toLowerCase())) {
                    skipped.push(p);
                } else {
                    existingNames.add(p.name.toLowerCase());
                    toInsert.push(p);
                }
            });

            if (toInsert.length === 0) {
                setResult({ total: parsedData.length, new: 0, skipped: parsedData.length });
                setIsImporting(false);
                return;
            }

            // Determine next internal_code safely from existing database content 
            const { data: allCurrent } = await supabase.from('products').select('internal_code');
            const maxCode = (allCurrent || []).reduce((max, p) => {
                const num = parseInt(p.internal_code, 10);
                return !isNaN(num) && num > max ? num : max;
            }, 0);

            let currentCodeInt = maxCode;

            const batchInserts = toInsert.map((p) => {
                currentCodeInt += 1;
                return {
                    internal_code: String(currentCodeInt).padStart(4, '0'),
                    name: p.name,
                    description: p.description,
                    category: p.category,
                    price: p.price,
                    cost_price: p.cost_price,
                    stock_qty: 0, // Admin needs to map inventory manually later
                    image_url: p.image_url,
                    supplier_name: p.supplier_name,
                    is_packaged: p.is_packaged,
                    is_active: true,
                    show_in_catalog: true,
                    feature_badge: 'none'
                };
            });

            setProgress('Enviando produtos para o banco de dados de nuvem da Lattuga...');

            // We do a single bulk insert
            const { error: dbError } = await supabase.from('products').insert(batchInserts);

            if (dbError) throw dbError;

            setProgress('Importação concluída com sucesso!');
            setResult({
                total: parsedData.length,
                new: toInsert.length,
                skipped: parsedData.length - toInsert.length
            });

            await fetchProducts(); // Re-sync global state

        } catch (err: any) {
            console.error('Erro de importação:', err);
            setError(`Erro ao importar para a Nuvem: ${err.message}`);
        } finally {
            setIsImporting(false);
        }
    };

    // Resets modal on close to avoid stale state on next open
    const handleClose = () => {
        if (!isImporting) {
            setError('');
            setResult(null);
            setParsedData(null);
            onClose();
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Importação Profissional via Excel" size="md">
            <div className="space-y-6">
                {!parsedData && !result && (
                    <div className="flex flex-col gap-4">
                        <div className="p-5 bg-brand-50/50 border border-brand-100/50 rounded-2xl flex items-start gap-4 shadow-sm">
                            <div className="bg-brand-100 text-brand-700 p-2 rounded-xl mt-0.5">
                                <FileSpreadsheet size={24} />
                            </div>
                            <div className="text-sm">
                                <p className="font-semibold text-gray-900 mb-1 text-base">Passo a Passo</p>
                                <ol className="list-decimal ml-4 space-y-2 mt-2 text-gray-700">
                                    <li>Mantenha o padrão e primeiro abaixe nossa Planilha Modelo Lattuga.</li>
                                    <li>Preencha a planilha no Excel/Google Sheets e não altere a linha verde de cabeçalhos.</li>
                                    <li>
                                        Na coluna opcional <b>URL da Imagem</b>, você pode colocar fotos prontas ou deixar vazio para usar a IA depois. <br/>
                                        <span className="text-xs text-brand-600 block mt-1">
                                            💡 <i>Dica: Encontre a imagem do produto na internet, clique nela com o botão direito e escolha <b>"Copiar endereço da imagem"</b> ou <b>"Copiar link da imagem"</b> (não baixe para o PC).</i>
                                        </span>
                                    </li>
                                    <li>Arraste o arquivo salvo ou clique no botão de Upload abaixo.</li>
                                </ol>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="mt-5 bg-white border-brand-200 text-brand-700 hover:bg-brand-50 transition-colors shadow-sm"
                                    onClick={downloadTemplate}
                                    leftIcon={<Download size={16} />}
                                >
                                    Baixar Planilha Modelo
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
                            <p className="font-semibold text-gray-800 text-lg">Clique para Subir Planilha Preenchida</p>
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
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            O sistema da Lattuga validou as colunas e encontrou <strong>{parsedData.length} produtos</strong> listados na planilha recém anexada. Eles estão mapeados e prontos para serem salvos de uma vez no banco de dados.
                        </p>
                        
                        {progress && (
                            <div className="text-center p-3 mb-5 bg-brand-50 border border-brand-100 rounded-xl animate-pulse text-sm text-brand-700 font-medium">
                                {progress}
                            </div>
                        )}

                        <div className="flex gap-3 justify-end pt-3">
                            <Button variant="ghost" onClick={() => setParsedData(null)} disabled={isImporting}>
                                Cancelar e Subir Nova
                            </Button>
                            <Button 
                                onClick={handleImport} 
                                isLoading={isImporting}
                                className="px-6"
                            >
                                Salvar {parsedData.length} Produtos na Nuvem
                            </Button>
                        </div>
                    </div>
                )}

                {result && (
                    <div className="p-8 bg-green-50/50 text-green-900 rounded-2xl flex flex-col items-center gap-3 border border-green-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-bl-full -mr-10 -mt-10" />
                        
                        <CheckCircle2 size={56} className="text-green-500 mb-2 relative z-10" />
                        <span className="font-extrabold text-3xl tracking-tight relative z-10">Concluído!</span>
                        
                        <div className="text-sm space-y-3 mt-4 bg-white p-5 rounded-xl border border-green-100 w-full text-left font-medium relative z-10 shadow-sm">
                            <p className="flex items-center gap-2">
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-md">✅ Sucesso</span> 
                                <strong>{result.new}</strong> novos produtos foram gravados.
                            </p>
                            {result.skipped > 0 && (
                                <p className="flex items-center gap-2 text-gray-600">
                                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">⏭️ Pulados</span> 
                                    <strong>{result.skipped}</strong> produtos ignorados (já existiam no sistema).
                                </p>
                            )}
                        </div>
                        
                        <Button className="mt-6 w-full py-6 text-lg shadow-green-600/20 shadow-lg relative z-10" onClick={handleClose}>
                            Ir para Catálogo
                        </Button>
                    </div>
                )}

                {(!parsedData && !result) && (
                    <div className="flex justify-end pt-2">
                        <Button variant="ghost" onClick={handleClose}>
                            Fechar Painel
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
}

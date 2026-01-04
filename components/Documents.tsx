
import React, { useState, useEffect, useRef } from 'react';
import { CondoDocument, User } from '../types';
import { db } from '../services/db';

interface DocumentsProps {
  selectedCondoId: string;
  notify: (msg: string, type?: 'success' | 'error') => void;
  currentUser: User;
}

const Documents: React.FC<DocumentsProps> = ({ selectedCondoId, notify, currentUser }) => {
  const [docs, setDocs] = useState<CondoDocument[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Contratos',
    fileUrl: ''
  });

  const refreshDocs = () => {
    setDocs(db.getDocuments().filter(d => d.condoId === selectedCondoId));
  };

  useEffect(() => {
    refreshDocs();
  }, [selectedCondoId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, fileUrl: reader.result as string }));
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fileUrl) return notify('Selecione um arquivo.', 'error');
    const newDoc: CondoDocument = {
      id: Math.random().toString(36).substr(2, 9),
      title: formData.title,
      category: formData.category,
      fileUrl: formData.fileUrl,
      uploadDate: new Date().toISOString(),
      condoId: selectedCondoId
    };
    db.saveDocument(newDoc);
    refreshDocs();
    setShowModal(false);
    notify('Documento arquivado!');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Arquivos do Condomínio</h2>
          <p className="text-slate-500 font-medium">Contratos, atas e documentos oficiais.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">
          Upload de Documento
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {docs.map(doc => (
          <div key={doc.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-lg transition-all group relative">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              </div>
              <div className="flex-1 overflow-hidden">
                <h4 className="font-bold text-slate-900 truncate">{doc.title}</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{doc.category}</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-50 pt-4">
              <span className="text-[10px] text-slate-400 font-bold">{new Date(doc.uploadDate).toLocaleDateString()}</span>
              <a href={doc.fileUrl} download={doc.title} className="text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline">Baixar Arquivo</a>
            </div>
          </div>
        ))}
        {docs.length === 0 && (
          <div className="col-span-full py-20 border-2 border-dashed border-slate-200 rounded-[40px] text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Sem arquivos no momento.</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Anexar Documento</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <form onSubmit={handleSave} className="p-10 space-y-6">
              <input type="text" required placeholder="Título do Documento" className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50 font-bold" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <select className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50 font-bold" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                <option>Contratos</option>
                <option>Atas de Assembléia</option>
                <option>Financeiro</option>
                <option>Regimento Interno</option>
                <option>Outros</option>
              </select>
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-3xl text-center bg-slate-50 cursor-pointer hover:border-blue-500 transition-all" onClick={() => fileInputRef.current?.click()}>
                {isUploading ? <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div> : 
                formData.fileUrl ? <p className="text-green-600 font-bold">Arquivo pronto!</p> : <p className="text-slate-400 font-bold">Clique para selecionar o arquivo</p>}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
              <button type="submit" className="w-full h-16 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 uppercase tracking-widest active:scale-95 transition-all">Concluir Upload</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;

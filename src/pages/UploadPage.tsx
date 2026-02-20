import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, X, CloudUpload } from 'lucide-react';

interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'done' | 'error';
  progress: number;
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map((file, i) => ({
      id: `${Date.now()}-${i}`,
      file,
      status: 'uploading' as const,
      progress: 0,
    }));
    setFiles(prev => [...prev, ...newFiles]);

    // Simulate upload progress
    newFiles.forEach(f => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setFiles(prev => prev.map(p => p.id === f.id ? { ...p, progress: 100, status: 'done' } : p));
        } else {
          setFiles(prev => prev.map(p => p.id === f.id ? { ...p, progress } : p));
        }
      }, 400);
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Upload de Documentos</h1>
        <p className="text-sm text-muted-foreground mt-1">Envie boletos, comprovantes, NFs, DANFEs ou recibos</p>
      </div>

      {/* Drop zone */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`upload-zone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <CloudUpload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-base font-medium text-foreground mb-1">
          Arraste seus documentos aqui
        </p>
        <p className="text-sm text-muted-foreground">
          ou clique para selecionar · PDF, JPG, PNG
        </p>
      </motion.div>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <h2 className="text-sm font-semibold text-foreground">Arquivos ({files.length})</h2>
            {files.map(f => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="glass-card p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {f.status === 'done' ? (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  ) : (
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{f.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(f.file.size / 1024).toFixed(0)} KB
                    {f.status === 'done' && ' · Processado'}
                  </p>
                  {f.status === 'uploading' && (
                    <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

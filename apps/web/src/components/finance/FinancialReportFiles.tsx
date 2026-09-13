import {
  CloudUploadOutlined,
  DescriptionOutlined,
  DownloadOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../services/api';

type FinancialFile = {
  id: string;
  name: string;
  originalName?: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
};

const fileName = (file: FinancialFile) => file.originalName || file.name;
const fileSize = (size: number) =>
  size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;

export function FinancialReportFiles() {
  const [files, setFiles] = useState<FinancialFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get<FinancialFile[]>('/drive/financial-reports');
      setFiles(data);
      setError('');
    } catch (cause) {
      setError(apiErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await api.post('/drive/financial-reports', {
        fileName: file.name,
        mimeType:
          file.type ||
          ({
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            xls: 'application/vnd.ms-excel',
            csv: 'text/csv',
            ods: 'application/vnd.oasis.opendocument.spreadsheet',
          }[file.name.split('.').pop()?.toLowerCase() || ''] ?? 'application/octet-stream'),
        contentBase64,
      });
      setMessage('Planilha enviada com sucesso.');
      await load();
    } catch (cause) {
      setError(apiErrorMessage(cause));
    } finally {
      setUploading(false);
    }
  };

  const download = async (file: FinancialFile) => {
    setDownloading(file.id);
    setError('');
    try {
      const { data } = await api.get(`/drive/financial-reports/${file.id}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName(file);
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(apiErrorMessage(cause));
    } finally {
      setDownloading('');
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
          <Box>
            <Typography variant="h6" fontWeight={900}>Planilhas financeiras</Typography>
            <Typography color="text.secondary">
              Envie e baixe relatórios em XLSX, XLS, CSV ou ODS. Limite de 20 MB por arquivo.
            </Typography>
          </Box>
          <Button component="label" variant="contained" startIcon={uploading ? <CircularProgress size={18} /> : <CloudUploadOutlined />} disabled={uploading}>
            {uploading ? 'Enviando...' : 'Enviar planilha'}
            <input
              hidden
              type="file"
              accept=".xlsx,.xls,.csv,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/vnd.oasis.opendocument.spreadsheet"
              onChange={(event) => {
                void upload(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </Button>
        </Stack>
        {message && <Alert severity="success" sx={{ mt: 2 }} onClose={() => setMessage('')}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {loading ? (
          <Box textAlign="center" py={4}><CircularProgress /></Box>
        ) : files.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>Nenhuma planilha financeira foi enviada.</Alert>
        ) : (
          <Stack spacing={1.25} mt={2}>
            {files.map((file) => (
              <Stack key={file.id} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1.5} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                <Stack direction="row" alignItems="center" gap={1.5} minWidth={0}>
                  <DescriptionOutlined color="primary" />
                  <Box minWidth={0}>
                    <Typography fontWeight={800} noWrap>{fileName(file)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fileSize(file.size)} • {new Date(file.createdAt).toLocaleString('pt-BR')}
                    </Typography>
                  </Box>
                </Stack>
                <Button startIcon={downloading === file.id ? <CircularProgress size={16} /> : <DownloadOutlined />} disabled={Boolean(downloading)} onClick={() => void download(file)}>
                  Baixar
                </Button>
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

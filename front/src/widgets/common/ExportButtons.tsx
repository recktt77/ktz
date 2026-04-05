import { useState } from 'react';
import { downloadPdf, downloadCsv, type ReportRole } from '@/services/api/reportService';

interface Props {
  role: ReportRole;
  locomotiveId?: string;
  compact?: boolean;
}

export function ExportButtons({ role, locomotiveId, compact }: Props) {
  const [loading, setLoading] = useState<'pdf' | 'csv' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (type: 'pdf' | 'csv') => {
    setLoading(type);
    setError(null);
    try {
      if (type === 'pdf') {
        await downloadPdf(role, locomotiveId);
      } else {
        await downloadCsv(role, locomotiveId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка скачивания');
    }
    setLoading(null);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
        style={{
          background: 'rgba(239,68,68,0.08)',
          color: '#f87171',
          border: '1px solid rgba(239,68,68,0.15)',
          opacity: loading === 'pdf' ? 0.6 : 1,
        }}
        onClick={() => handleDownload('pdf')}
        disabled={!!loading}
        title="Скачать PDF отчёт"
      >
        {loading === 'pdf' ? (
          <span className="login-card__spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        )}
        {!compact && 'PDF'}
      </button>

      <button
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
        style={{
          background: 'rgba(52,211,153,0.08)',
          color: '#34d399',
          border: '1px solid rgba(52,211,153,0.15)',
          opacity: loading === 'csv' ? 0.6 : 1,
        }}
        onClick={() => handleDownload('csv')}
        disabled={!!loading}
        title="Скачать CSV отчёт"
      >
        {loading === 'csv' ? (
          <span className="login-card__spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        )}
        {!compact && 'CSV'}
      </button>

      {error && (
        <span className="text-xs" style={{ color: 'var(--status-critical)' }}>{error}</span>
      )}
    </div>
  );
}

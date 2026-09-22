import React, { useMemo, useState } from 'react';
import {
  FileText, IdCard, Receipt, File, ExternalLink, Trash2, RefreshCw, Upload, FilePlus2, FolderOpen,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { FileUpload } from '../../components/common/FileUpload';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { Alert } from '../../components/common/Feedback';
import { useAction } from '../../hooks/useAction';
import { useToast } from '../../context/ToastContext';
import { employeesApi, uploadApi } from '../../api/endpoints';
import { fileUrl } from '../../api/client';
import { DOCUMENT_TYPE_LABELS } from '../../utils/constants';
import { formatDate } from '../../utils/format';

const TYPE_ICONS = { resume: FileText, 'id-proof': IdCard, 'salary-slip': Receipt, other: File };
const UPLOAD_TYPES = [{ value: 'id-proof', label: 'ID Proof' }, { value: 'other', label: 'Other' }];
const DOCUMENT_ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp';

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i, 1).toLocaleString('en-IN', { month: 'long' }),
}));

/** Resume, uploaded documents and salary slips for one employee. */
export function DocumentsTab({ employee, canEdit, onRefresh, refreshing }) {
  const toast = useToast();
  const [pendingDelete, setPendingDelete] = useState(null);
  const [docForm, setDocForm] = useState({ name: '', type: 'id-proof', file: null });
  const [docErrors, setDocErrors] = useState({});
  const [slipQueued, setSlipQueued] = useState(false);

  const now = new Date();
  const [slip, setSlip] = useState({ month: String(now.getMonth() + 1), year: String(now.getFullYear()) });
  const yearOptions = [0, 1, 2].map((offset) => String(now.getFullYear() - offset));

  const documents = useMemo(() => [
    ...(employee.resume?.url ? [{ ...employee.resume, type: 'resume' }] : []),
    ...(employee.documents || []),
  ].sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)), [employee]);

  const [uploadResume, uploadingResume] = useAction((file) => uploadApi.resume(file, employee._id), {
    success: 'Resume uploaded',
    error: 'Resume upload failed',
    onSuccess: onRefresh,
  });

  const [uploadDocument, uploadingDocument] = useAction(
    ({ file, name, type }) => uploadApi.document(file, { name: name || undefined, type, employeeId: employee._id }),
    {
      success: 'Document uploaded',
      error: 'Document upload failed',
      onSuccess: () => {
        setDocForm({ name: '', type: 'id-proof', file: null });
        onRefresh();
      },
    },
  );

  const [removeDocument, removing] = useAction((id) => uploadApi.remove(id), {
    success: 'Document deleted',
    error: 'Could not delete document',
    onSuccess: () => {
      setPendingDelete(null);
      onRefresh();
    },
  });

  const [generateSlip, generating] = useAction(
    () => employeesApi.generateSalarySlip(employee._id, { month: Number(slip.month), year: Number(slip.year) }),
    {
      success: (res) => res.data.message || 'Salary slip generation queued',
      error: 'Could not generate salary slip',
      onSuccess: () => setSlipQueued(true),
    },
  );

  const submitDocument = (e) => {
    e.preventDefault();
    const errors = {};
    if (!docForm.file) errors.file = 'Choose a file to upload';
    if (docForm.name.length > 100) errors.name = 'Name must be under 100 characters';
    setDocErrors(errors);
    if (!Object.keys(errors).length) uploadDocument({ ...docForm, name: docForm.name.trim() });
  };

  return (
    <div className="stack">
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Documents</h3>
            <span className="card-subtitle">
              {documents.length ? `${documents.length} file${documents.length === 1 ? '' : 's'}` : 'Resume, ID proofs and salary slips'}
            </span>
          </div>
          <Button variant="secondary" size="sm" icon={RefreshCw} loading={refreshing} onClick={onRefresh}>
            Refresh
          </Button>
        </div>

        {documents.length ? (
          <div className="stack-sm">
            {documents.map((doc) => {
              const Icon = TYPE_ICONS[doc.type] || File;
              return (
                <div key={doc._id} className="list-item wrap-mobile">
                  <span className="notification-icon"><Icon size={18} /></span>
                  <div className="list-item-body">
                    <span className="list-item-title truncate">{doc.name}</span>
                    <span className="list-item-meta">
                      {DOCUMENT_TYPE_LABELS[doc.type] || 'Document'} · Uploaded {formatDate(doc.uploadedAt)}
                    </span>
                  </div>
                  <div className="list-item-actions">
                    <a className="btn btn-secondary btn-sm" href={fileUrl(doc.url)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={14} />
                      View
                    </a>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="btn-icon"
                        icon={Trash2}
                        aria-label={`Delete ${doc.name}`}
                        onClick={() => setPendingDelete(doc)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            compact
            icon={FolderOpen}
            title="No documents yet"
            description={canEdit ? 'Upload a resume or ID proof below, or generate a salary slip.' : 'Documents uploaded by HR will appear here.'}
          />
        )}
      </div>

      {canEdit && (
        <div className="grid-3">
          <div className="card">
            <div className="card-title-row">
              <FileText size={18} />
              <h3 className="card-title">{employee.resume?.url ? 'Replace Resume' : 'Upload Resume'}</h3>
            </div>
            <FileUpload
              hint="PDF, DOC or DOCX (max. 10MB)"
              accept=".pdf,.doc,.docx"
              uploading={uploadingResume}
              onSelect={(file) => uploadResume(file)}
              onError={(msg) => toast.error('Invalid file', msg)}
            />
            {employee.resume?.url && <p className="text-xs text-muted">Uploading a new resume replaces the current one.</p>}
          </div>

          <form className="card" onSubmit={submitDocument} noValidate>
            <div className="card-title-row">
              <FilePlus2 size={18} />
              <h3 className="card-title">Add Document</h3>
            </div>
            <Input
              label="Document Name"
              placeholder="e.g. Aadhaar Card"
              maxLength={100}
              hint="Defaults to the file name"
              value={docForm.name}
              error={docErrors.name}
              onChange={(e) => setDocForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Select
              label="Type"
              placeholder={null}
              options={UPLOAD_TYPES}
              value={docForm.type}
              onChange={(e) => setDocForm((f) => ({ ...f, type: e.target.value }))}
            />
            <FileUpload
              label="File"
              hint="PDF, DOC, DOCX, PNG, JPG or WEBP (max. 10MB)"
              accept={DOCUMENT_ACCEPT}
              selectedName={docForm.file?.name}
              disabled={uploadingDocument}
              onSelect={(file) => {
                setDocForm((f) => ({ ...f, file }));
                setDocErrors((errs) => ({ ...errs, file: undefined }));
              }}
              onError={(msg) => toast.error('Invalid file', msg)}
            />
            {docErrors.file && <p className="form-error" style={{ marginTop: '-0.5rem', marginBottom: '0.75rem' }}>{docErrors.file}</p>}
            <Button type="submit" icon={Upload} loading={uploadingDocument} block>
              Upload Document
            </Button>
          </form>

          <div className="card">
            <div className="card-title-row">
              <Receipt size={18} />
              <h3 className="card-title">Generate Salary Slip</h3>
            </div>
            <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
              A PDF slip is generated in the background and added to the documents list.
            </p>
            <div className="form-grid">
              <Select
                label="Month"
                placeholder={null}
                options={MONTH_OPTIONS}
                value={slip.month}
                onChange={(e) => setSlip((s) => ({ ...s, month: e.target.value }))}
              />
              <Select
                label="Year"
                placeholder={null}
                options={yearOptions}
                value={slip.year}
                onChange={(e) => setSlip((s) => ({ ...s, year: e.target.value }))}
              />
            </div>
            {slipQueued && (
              <Alert type="info">
                <div className="stack-sm">
                  <span>The salary slip is being generated and will appear in the documents list shortly.</span>
                  <div>
                    <Button variant="secondary" size="sm" icon={RefreshCw} loading={refreshing} onClick={onRefresh}>
                      Refresh documents
                    </Button>
                  </div>
                </div>
              </Alert>
            )}
            <Button icon={Receipt} loading={generating} block onClick={() => generateSlip()}>
              Generate Slip
            </Button>
          </div>
        </div>
      )}

      <Modal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete Document"
        confirmLabel="Delete"
        variant="danger"
        confirmLoading={removing}
        onConfirm={() => removeDocument(pendingDelete._id)}
      >
        <p>
          Permanently delete <strong>{pendingDelete?.name}</strong>
          {pendingDelete ? ` (${DOCUMENT_TYPE_LABELS[pendingDelete.type] || 'Document'})` : ''}? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

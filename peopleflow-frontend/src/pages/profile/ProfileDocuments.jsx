import React, { useState } from 'react';
import { Eye, FileText, FolderOpen, Receipt, Trash2 } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { FileUpload } from '../../components/common/FileUpload';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { useAction } from '../../hooks/useAction';
import { useToast } from '../../context/ToastContext';
import { uploadApi } from '../../api/endpoints';
import { fileUrl } from '../../api/client';
import { DOCUMENT_TYPE_LABELS } from '../../utils/constants';
import { formatDate } from '../../utils/format';
import { ProfileSection } from './ProfileSection';

const DOCUMENT_ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp';
const RESUME_ACCEPT = '.pdf,.doc,.docx';
const UPLOAD_TYPE_OPTIONS = [
  { value: 'id-proof', label: DOCUMENT_TYPE_LABELS['id-proof'] },
  { value: 'other', label: DOCUMENT_TYPE_LABELS.other },
];

function DocumentRow({ document, onDelete }) {
  return (
    <div className="list-item wrap-mobile">
      <span className="notification-icon">
        <FileText size={18} />
      </span>
      <div className="list-item-body">
        <span className="list-item-title truncate" title={document.name}>{document.name}</span>
        <span className="list-item-meta">
          {DOCUMENT_TYPE_LABELS[document.type] || 'Document'} · Uploaded {formatDate(document.uploadedAt)}
        </span>
      </div>
      <div className="list-item-actions">
        <a
          className="btn btn-secondary btn-sm"
          href={fileUrl(document.url)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${document.name}`}
        >
          <Eye size={14} />
          View
        </a>
        {onDelete && (
          <Button variant="ghost" size="sm" className="btn-icon" icon={Trash2} aria-label={`Delete ${document.name}`} onClick={() => onDelete(document)} />
        )}
      </div>
    </div>
  );
}

export function ProfileDocuments({ employee, refreshProfile }) {
  const toast = useToast();
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('id-proof');
  const [pendingDelete, setPendingDelete] = useState(null);

  const documents = employee.documents || [];
  const payslips = documents
    .filter((d) => d.type === 'salary-slip')
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  const otherDocuments = documents.filter((d) => d.type !== 'salary-slip');

  const [uploadResume, uploadingResume] = useAction((file) => uploadApi.resume(file), {
    success: employee.resume ? 'Resume replaced' : 'Resume uploaded',
    error: 'Resume upload failed',
    onSuccess: () => refreshProfile(),
  });

  const [uploadDocument, uploadingDocument] = useAction(
    (file) => uploadApi.document(file, { name: docName.trim() || undefined, type: docType }),
    {
      success: 'Document uploaded',
      error: 'Document upload failed',
      onSuccess: async () => {
        setDocName('');
        await refreshProfile();
      },
    },
  );

  const [removeDocument, removing] = useAction((id) => uploadApi.remove(id), {
    success: 'Document deleted',
    onSuccess: async () => {
      setPendingDelete(null);
      await refreshProfile();
    },
  });

  const showUploadError = (message) => toast.error('File not accepted', message);

  return (
    <>
      <ProfileSection icon={FolderOpen} title="Documents" subtitle="Your resume and supporting documents">
        <div className="stack">
          <div className="stack-sm">
            <span className="text-sm text-bold">Resume</span>
            {employee.resume?.url ? (
              <DocumentRow document={{ ...employee.resume, type: 'resume' }} onDelete={setPendingDelete} />
            ) : (
              <p className="text-sm text-muted">No resume uploaded yet.</p>
            )}
            <FileUpload
              label={employee.resume?.url ? 'Replace resume' : 'Upload resume'}
              hint="PDF, DOC or DOCX (max. 10MB)"
              accept={RESUME_ACCEPT}
              maxSizeMb={10}
              uploading={uploadingResume}
              onSelect={uploadResume}
              onError={showUploadError}
            />
          </div>

          <div className="stack-sm">
            <span className="text-sm text-bold">Other documents</span>
            {otherDocuments.length ? (
              otherDocuments.map((doc) => <DocumentRow key={doc._id} document={doc} onDelete={setPendingDelete} />)
            ) : (
              <p className="text-sm text-muted">No documents uploaded yet.</p>
            )}
            <div className="form-grid">
              <Input
                label="Document name"
                placeholder="e.g. Aadhaar card"
                maxLength={100}
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                disabled={uploadingDocument}
                hint="Optional — defaults to the file name"
              />
              <Select
                label="Document type"
                placeholder={null}
                options={UPLOAD_TYPE_OPTIONS}
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                disabled={uploadingDocument}
              />
            </div>
            <FileUpload
              hint="PDF, DOC, DOCX, PNG, JPG or WEBP (max. 10MB)"
              accept={DOCUMENT_ACCEPT}
              maxSizeMb={10}
              uploading={uploadingDocument}
              onSelect={uploadDocument}
              onError={showUploadError}
            />
          </div>
        </div>
      </ProfileSection>

      <ProfileSection icon={Receipt} title="Payslips" subtitle="Salary slips issued by HR">
        {payslips.length ? (
          <div className="stack-sm">
            {payslips.map((doc) => <DocumentRow key={doc._id} document={doc} />)}
          </div>
        ) : (
          <EmptyState compact icon={Receipt} title="No payslips yet" description="Payslips generated by HR will appear here." />
        )}
      </ProfileSection>

      <Modal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={pendingDelete?.type === 'resume' ? 'Delete Resume' : 'Delete Document'}
        confirmLabel="Delete"
        variant="danger"
        confirmLoading={removing}
        onConfirm={() => removeDocument(pendingDelete._id)}
      >
        <p>
          Delete <strong>{pendingDelete?.name}</strong>? The file will be permanently removed. This cannot be undone.
        </p>
      </Modal>
    </>
  );
}

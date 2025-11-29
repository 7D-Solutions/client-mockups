import { useEffect, useState } from 'react';
import api, { handleApiError } from '../lib/api';
import { Icon } from '../infrastructure/components/Icon';
import { Button } from '../infrastructure/components/Button';
import { Modal } from '../infrastructure/components/Modal';
import { LoadingSpinner } from '../infrastructure/components/LoadingSpinner';
import { DataTable, DataTableColumn } from '../infrastructure/components/DataTable';
import { FormInput } from '../infrastructure/components/FormInput';
import { FormSelect } from '../infrastructure/components/FormSelect';
import { FormTextarea } from '../infrastructure/components/FormTextarea';
import { Badge } from '../infrastructure/components/Badge';
import { CloseButton, SaveButton } from '../infrastructure/components/SemanticButtons';
import { useColumnManager } from '../infrastructure/hooks';
import type { Message } from '../types';
import styles from './Messages.module.css';

const Messages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [formData, setFormData] = useState<Partial<Message>>({
    subject: 'general',
    message_text: '',
    contact_method: 'email',
    message_date: new Date().toISOString().split('T')[0],
  });
  const [replyText, setReplyText] = useState('');

  const columnManager = useColumnManager('messages-table', [
    { id: 'tenant_name', label: 'Tenant', visible: true },
    { id: 'subject', label: 'Subject', visible: true },
    { id: 'message_text', label: 'Message', visible: true },
    { id: 'message_date', label: 'Date', visible: true },
    { id: 'contact_method', label: 'Method', visible: true },
    { id: 'response_text', label: 'Status', visible: true },
    { id: 'actions', label: 'Actions', visible: true },
  ]);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const response = await api.get('/rental/messages');
      setMessages(response.data.data);
    } catch (error) {
      console.error('Error loading messages:', handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMessage) {
        await api.put(`/rental/messages/${editingMessage.id}`, formData);
      } else {
        await api.post('/rental/messages', formData);
      }
      setShowModal(false);
      setEditingMessage(null);
      resetForm();
      loadMessages();
    } catch (error) {
      console.error('Error saving message:', handleApiError(error));
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingToMessage) return;

    try {
      await api.put(`/rental/messages/${replyingToMessage.id}`, {
        response_text: replyText,
        response_date: new Date().toISOString(),
      });
      setShowReplyModal(false);
      setReplyingToMessage(null);
      setReplyText('');
      loadMessages();
    } catch (error) {
      console.error('Error sending reply:', handleApiError(error));
    }
  };

  const handleRowClick = (message: Message) => {
    setEditingMessage(message);
    setFormData(message);
    setShowModal(true);
  };

  const handleReplyClick = (e: React.MouseEvent, message: Message) => {
    e.stopPropagation();
    setReplyingToMessage(message);
    setReplyText('');
    setShowReplyModal(true);
  };

  const resetForm = () => {
    setFormData({
      subject: 'general',
      message_text: '',
      contact_method: 'email',
      message_date: new Date().toISOString().split('T')[0],
    });
  };

  const handleAddNew = () => {
    setEditingMessage(null);
    resetForm();
    setShowModal(true);
  };

  const columns: DataTableColumn<Message>[] = [
    {
      key: 'tenant_name',
      header: 'Tenant',
      render: (message) => (
        <div className={styles.tenantCell}>
          <Icon name="user" />
          {message.tenant_name}
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (message) => (
        <span className={styles.subjectCell}>
          {message.subject.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'message_text',
      header: 'Message',
      render: (message) => (
        <div className={styles.messageCell}>
          {message.message_text}
        </div>
      ),
    },
    {
      key: 'message_date',
      header: 'Date',
      render: (message) => new Date(message.message_date).toLocaleDateString(),
    },
    {
      key: 'contact_method',
      header: 'Method',
      render: (message) => (
        <span className={styles.methodCell}>
          {message.contact_method.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'response_text',
      header: 'Status',
      render: (message) => (
        <Badge variant={message.response_text ? 'success' : 'warning'}>
          {message.response_text ? 'Responded' : 'Pending'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (message) => (
        !message.response_text && (
          <Button
            variant="primary"
            size="sm"
            onClick={(e) => handleReplyClick(e, message)}
            icon={<Icon name="reply" />}
          >
            Respond
          </Button>
        )
      ),
    },
  ];

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={styles.messagesPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Messages</h1>
          <p className={styles.pageDescription}>Tenant communication</p>
        </div>
        <Button variant="primary" onClick={handleAddNew} icon={<Icon name="plus" />}>
          New Message
        </Button>
      </div>

      <DataTable
        tableId="messages-table"
        columns={columns}
        data={messages}
        onRowClick={handleRowClick}
        columnManager={columnManager}
        emptyMessage="No messages found. Start a conversation with your tenants."
      />

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingMessage ? 'Edit Message' : 'New Message'}
        >
          <form onSubmit={handleSubmit}>
            <Modal.Body>
              <FormSelect
                label="Subject"
                id="subject"
                value={formData.subject || 'general'}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value as Message['subject'] })}
                required
              >
                <option value="general">General</option>
                <option value="maintenance">Maintenance</option>
                <option value="payment">Payment</option>
                <option value="lease">Lease</option>
                <option value="complaint">Complaint</option>
                <option value="other">Other</option>
              </FormSelect>

              <FormTextarea
                label="Message"
                id="message_text"
                value={formData.message_text || ''}
                onChange={(e) => setFormData({ ...formData, message_text: e.target.value })}
                required
                rows={5}
              />

              <div className={styles.formRow}>
                <FormSelect
                  label="Contact Method"
                  id="contact_method"
                  value={formData.contact_method || 'email'}
                  onChange={(e) => setFormData({ ...formData, contact_method: e.target.value as Message['contact_method'] })}
                  required
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="text">Text</option>
                  <option value="in_person">In Person</option>
                </FormSelect>

                <FormInput
                  label="Date"
                  id="message_date"
                  type="date"
                  value={formData.message_date || ''}
                  onChange={(e) => setFormData({ ...formData, message_date: e.target.value })}
                  required
                />
              </div>
            </Modal.Body>

            <Modal.Actions>
              <CloseButton onClick={() => setShowModal(false)} />
              <SaveButton type="submit">
                {editingMessage ? 'Update' : 'Send'} Message
              </SaveButton>
            </Modal.Actions>
          </form>
        </Modal>
      )}

      {showReplyModal && replyingToMessage && (
        <Modal
          isOpen={showReplyModal}
          onClose={() => setShowReplyModal(false)}
          title="Reply to Message"
        >
          <form onSubmit={handleReplySubmit}>
            <Modal.Body>
              <div className={styles.originalMessage}>
                <div className={styles.originalMessageHeader}>
                  <strong>Original Message:</strong>
                  <span className={styles.originalMessageDate}>
                    {new Date(replyingToMessage.message_date).toLocaleDateString()}
                  </span>
                </div>
                <p className={styles.originalMessageText}>
                  {replyingToMessage.message_text}
                </p>
              </div>

              <FormTextarea
                label="Your Response"
                id="response_text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                required
                rows={5}
                placeholder="Type your response here..."
              />
            </Modal.Body>

            <Modal.Actions>
              <CloseButton onClick={() => setShowReplyModal(false)} />
              <SaveButton type="submit">
                Send Reply
              </SaveButton>
            </Modal.Actions>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Messages;

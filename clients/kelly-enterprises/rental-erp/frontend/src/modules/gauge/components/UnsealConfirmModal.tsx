// For Claude: Use Modal instead of window.confirm() or window.alert()
// Use Button instead of raw <button> elements
// Use Form components instead of raw <input>, <textarea>
import React, { useState, useEffect } from 'react'
import { Modal, Button, Icon, FormCheckbox, FormTextarea } from '../../../infrastructure'
import type { UnsealRequest } from '../types'

interface UnsealConfirmModalProps {
  isOpen: boolean
  request: UnsealRequest | null
  type: 'approve' | 'confirm_unseal' | 'reject'
  onConfirm: (data?: any) => void
  onCancel: () => void
}

export function UnsealConfirmModal({
  isOpen,
  request,
  type,
  onConfirm,
  onCancel
}: UnsealConfirmModalProps) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [showUnsealNow, setShowUnsealNow] = useState(false)
  const [notifyRequesterAcknowledged, setNotifyRequesterAcknowledged] = useState(false)
  const [validationError, setValidationError] = useState('')

  // Reset state when modal opens or request changes
  useEffect(() => {
    if (isOpen) {
      setRejectionReason('')
      setShowUnsealNow(false)
      setNotifyRequesterAcknowledged(false)
      setValidationError('')
    }
  }, [isOpen, request?.id])

  if (!isOpen || !request) return null

  const handleConfirm = () => {
    if (type === 'reject') {
      if (!rejectionReason.trim()) {
        setValidationError('Please provide a reason for rejection')
        return
      }
      onConfirm({ reason: rejectionReason })
    } else if (type === 'approve') {
      onConfirm({ unsealNow: showUnsealNow })
    } else if (type === 'confirm_unseal') {
      if (!notifyRequesterAcknowledged) {
        setValidationError('Please acknowledge that you will notify the requester')
        return
      }
      onConfirm()
    } else {
      onConfirm()
    }
  }

  const getTitle = () => {
    switch (type) {
      case 'approve': return 'Approve Unseal Request'
      case 'confirm_unseal': return 'Confirm Physical Unsealing'
      case 'reject': return 'Reject Unseal Request'
      default: return 'Confirm Action'
    }
  }

  const getButtonText = () => {
    switch (type) {
      case 'approve': return 'Approve Request'
      case 'confirm_unseal': return 'Confirm Unsealed'
      case 'reject': return 'Reject Request'
      default: return 'Confirm'
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={getTitle()}
      size="md"
    >
      <Modal.Body>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-4)'
        }}>
          <Icon name={type === 'reject' ? 'times' : type === 'confirm_unseal' ? 'unlock' : 'check-circle'} />
          <span style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)'
          }}>{getTitle()}</span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-2)',
          gap: 'var(--space-3)'
        }}>
          <span style={{
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-text-secondary)',
            flexShrink: 0
          }}>Gauge:</span>
          <span style={{ textAlign: 'right', wordBreak: 'break-word' }}>{request.gauge_name || 'Unknown'}</span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-2)',
          gap: 'var(--space-3)'
        }}>
          <span style={{
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-text-secondary)',
            flexShrink: 0
          }}>ID:</span>
          <span style={{ textAlign: 'right', wordBreak: 'break-word' }}>{request.gauge_id}</span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-2)',
          gap: 'var(--space-3)'
        }}>
          <span style={{
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-text-secondary)',
            flexShrink: 0
          }}>Requested by:</span>
          <span style={{ textAlign: 'right', wordBreak: 'break-word' }}>{request.requester_name || 'Unknown'}</span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-2)',
          gap: 'var(--space-3)'
        }}>
          <span style={{
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-text-secondary)',
            flexShrink: 0
          }}>Date:</span>
          <span style={{ textAlign: 'right', wordBreak: 'break-word' }}>{new Date(request.created_at).toLocaleString()}</span>
        </div>
        {request.reason && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-2)',
            gap: 'var(--space-3)'
          }}>
            <span style={{
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-secondary)',
              flexShrink: 0
            }}>Reason:</span>
            <span style={{ textAlign: 'right', wordBreak: 'break-word' }}>{request.reason}</span>
          </div>
        )}

      {type === 'approve' && (
        <>
          <div style={{
            backgroundColor: 'var(--color-info-bg)',
            border: '1px solid var(--color-info-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-4)'
          }}>
            <p style={{
              margin: 0,
              fontWeight: 'var(--font-weight-medium)',
              marginBottom: 'var(--space-2)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)'
            }}>
              <Icon name="info-circle" />
              Approval Process
            </p>
            <p style={{ margin: 0 }}>
              Approving this request will allow the gauge to be unsealed. The requester will be notified.
            </p>
          </div>

          <FormCheckbox
            label="I want to physically unseal this gauge now"
            checked={showUnsealNow}
            onChange={setShowUnsealNow}
          />
        </>
      )}

      {type === 'confirm_unseal' && (
        <>
          <div style={{
            backgroundColor: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-4)'
          }}>
            <p style={{
              margin: 0,
              fontWeight: 'var(--font-weight-medium)',
              marginBottom: 'var(--space-2)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)'
            }}>
              <Icon name="exclamation-triangle" />
              Physical Unsealing Required
            </p>
            <p style={{ margin: 0 }}>
              Please confirm that you have physically unsealed this gauge.
            </p>
          </div>

          <FormCheckbox
            label={`I acknowledge that I will notify ${request.requester_name || 'the requester'} that the gauge has been unsealed`}
            checked={notifyRequesterAcknowledged}
            onChange={(checked) => {
              setNotifyRequesterAcknowledged(checked)
              if (validationError) setValidationError('')
            }}
          />
          
          {validationError && (
            <p style={{
              color: 'var(--color-danger)',
              fontSize: 'var(--font-size-sm)',
              marginTop: 'var(--space-2)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)'
            }}>
              <Icon name="exclamation-triangle" />
              {validationError}
            </p>
          )}
        </>
      )}

      {type === 'reject' && (
        <>
          <div style={{
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-4)'
          }}>
            <p style={{
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)'
            }}>
              <Icon name="exclamation-triangle" />
              This will reject the unseal request. The requester will be notified.
            </p>
          </div>

          <FormTextarea
            label="Reason for rejection (required):"
            value={rejectionReason}
            onChange={(e) => {
              setRejectionReason(e.target.value)
              if (validationError) setValidationError('')
            }}
            placeholder="Please provide a clear reason for rejecting this request..."
            required
            rows={4}
          />
            {validationError && (
              <p style={{
                color: 'var(--color-danger)',
                fontSize: 'var(--font-size-sm)',
                marginTop: 'var(--space-2)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)'
              }}>
                <Icon name="exclamation-triangle" />
                {validationError}
              </p>
            )}
        </>
      )}
      </Modal.Body>

      <Modal.Actions>
        <Button 
          variant={type === 'reject' ? 'danger' : 'primary'}
          onClick={handleConfirm}
          icon={<Icon name={type === 'reject' ? 'times' : 'check'} />}
        > 
          {getButtonText()}
        </Button>
        <Button 
          variant="secondary"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </Modal.Actions>
    </Modal>
  )
}
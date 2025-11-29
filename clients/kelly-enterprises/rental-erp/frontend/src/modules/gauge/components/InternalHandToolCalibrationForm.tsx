import { useState, useEffect, useCallback } from 'react';
import { Button, Icon, FormInput, FormCheckbox, FormTextarea, FormSection } from '../../../infrastructure/components';
import { useToast } from '../../../infrastructure';
import { apiClient } from '../../../infrastructure/api/client';

interface MeasurementPoint {
  label: string;
  reference: number;
  actual: number;
  deviation: number;
  pass: boolean;
}

interface VisualInspection {
  no_damage: boolean;
  clean_condition: boolean;
  smooth_operation: boolean;
  readable_markings: boolean;
  notes: string;
}

interface GaugeBlock {
  value: number;
  label: string;
  description: string;
}

interface Props {
  gaugeId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function InternalHandToolCalibrationForm({ gaugeId, onSuccess, onCancel }: Props) {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [numberOfPoints, setNumberOfPoints] = useState<3 | 4 | 5>(3);
  const [technicianName, setTechnicianName] = useState('');
  const [temperature, setTemperature] = useState('68');
  const [humidity, setHumidity] = useState('45');

  // Gauge block suggestions from backend
  const [availableBlocks, setAvailableBlocks] = useState<number[]>([]);
  const [suggestedPoints, setSuggestedPoints] = useState<GaugeBlock[]>([]);
  const [tolerance, setTolerance] = useState(0.001);
  const [unit, setUnit] = useState('inches');

  // Measurement points
  const [measurementPoints, setMeasurementPoints] = useState<MeasurementPoint[]>([
    { label: 'Low', reference: 0, actual: 0, deviation: 0, pass: true },
    { label: 'Mid', reference: 0, actual: 0, deviation: 0, pass: true },
    { label: 'High', reference: 0, actual: 0, deviation: 0, pass: true }
  ]);

  // Visual inspection
  const [visualInspection, setVisualInspection] = useState<VisualInspection>({
    no_damage: true,
    clean_condition: true,
    smooth_operation: true,
    readable_markings: true,
    notes: ''
  });

  // Selected gauge blocks for each measurement point
  const [selectedBlocks, setSelectedBlocks] = useState<(number | null)[]>([null, null, null]);

  const loadSuggestedBlocks = useCallback(async () => {
    try {
      setIsLoadingBlocks(true);
      setLoadError(null);
      const response = await apiClient.get(`/gauges/calibration/gauges/${gaugeId}/gauge-blocks`);

      if (response.data.success) {
        setAvailableBlocks(response.data.data.available_blocks || []);
        setSuggestedPoints(response.data.data.suggested_points || []);
        setTolerance(response.data.data.tolerance || 0.001);
        if (response.data.data.tool_range?.unit) {
          setUnit(response.data.data.tool_range.unit);
        }
      }
    } catch (error: any) {
      console.error('Error loading gauge blocks:', error);

      // Extract user-friendly error message from backend
      const errorMessage = error.response?.data?.message || 'Failed to load gauge block suggestions. Please verify this gauge is configured as a hand tool with proper specifications.';

      setLoadError(errorMessage);
      toast.error('Cannot Load Gauge Blocks', errorMessage);
    } finally {
      setIsLoadingBlocks(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gaugeId]);

  // Load suggested gauge blocks on mount
  useEffect(() => {
    loadSuggestedBlocks();
  }, [loadSuggestedBlocks]);

  // Update measurement points when number of points changes
  useEffect(() => {
    const labels = ['Low', 'Quarter', 'Mid', 'Three-Quarter', 'High'];

    setMeasurementPoints(prevPoints => {
      const newPoints: MeasurementPoint[] = [];
      for (let i = 0; i < numberOfPoints; i++) {
        const existingPoint = prevPoints[i];
        newPoints.push(existingPoint || {
          label: labels[i] || `Point ${i + 1}`,
          reference: 0,
          actual: 0,
          deviation: 0,
          pass: true
        });
      }
      return newPoints;
    });

    setSelectedBlocks(prevBlocks => {
      const newSelectedBlocks: (number | null)[] = [];
      for (let i = 0; i < numberOfPoints; i++) {
        newSelectedBlocks.push(prevBlocks[i] || null);
      }
      return newSelectedBlocks;
    });
  }, [numberOfPoints]);

  // Auto-populate suggested points when loaded
  useEffect(() => {
    if (suggestedPoints.length >= numberOfPoints) {
      setMeasurementPoints(prevPoints =>
        prevPoints.map((point, index) => {
          if (index < suggestedPoints.length && point.reference === 0) {
            return {
              ...point,
              label: suggestedPoints[index].label,
              reference: suggestedPoints[index].value
            };
          }
          return point;
        })
      );

      // Auto-select suggested blocks
      setSelectedBlocks(prevBlocks =>
        prevBlocks.map((_, index) => {
          if (index < suggestedPoints.length) {
            return suggestedPoints[index].value;
          }
          return null;
        })
      );
    }
  }, [suggestedPoints, numberOfPoints]);

  const handleBlockSelection = (pointIndex: number, blockValue: number) => {
    const newSelectedBlocks = [...selectedBlocks];
    newSelectedBlocks[pointIndex] = blockValue;
    setSelectedBlocks(newSelectedBlocks);

    // Update the measurement point reference value
    const newPoints = [...measurementPoints];
    newPoints[pointIndex] = {
      ...newPoints[pointIndex],
      reference: blockValue
    };
    setMeasurementPoints(newPoints);
  };

  const handleActualValueChange = (index: number, value: string) => {
    const actualValue = parseFloat(value) || 0;
    const newPoints = [...measurementPoints];
    const deviation = actualValue - newPoints[index].reference;
    const pass = Math.abs(deviation) <= tolerance;

    newPoints[index] = {
      ...newPoints[index],
      actual: actualValue,
      deviation,
      pass
    };
    setMeasurementPoints(newPoints);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!technicianName.trim()) {
      toast.error('Validation Error', 'Technician name is required');
      return;
    }

    if (measurementPoints.some(p => p.reference === 0 || p.actual === 0)) {
      toast.error('Validation Error', 'All measurement points must have reference and actual values');
      return;
    }

    try {
      setIsLoading(true);

      const calibrationData = {
        number_of_points: numberOfPoints,
        tolerance_spec: `±${tolerance} ${unit}`,
        gauge_blocks_used: selectedBlocks.filter(b => b !== null).join(', '),
        technician_name: technicianName,
        temperature: parseFloat(temperature) || 68,
        humidity: parseFloat(humidity) || 45,
        measurement_points: measurementPoints,
        visual_inspection: visualInspection
      };

      const response = await apiClient.post(
        `/gauges/calibration/gauges/${gaugeId}/internal-hand-tool`,
        calibrationData
      );

      if (response.data.success) {
        toast.success('Calibration Recorded', `Certificate ${response.data.data.certificate_number} generated successfully`);
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error: any) {
      console.error('Error recording calibration:', error);
      const message = error.response?.data?.message || 'Failed to record calibration';
      toast.error('Calibration Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const overallPass = measurementPoints.every(p => p.pass) && Object.values(visualInspection).slice(0, 4).every(v => v === true);

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Configuration */}
      <FormSection title="Configuration">
        <div style={{ padding: 'var(--space-4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-gray-50)' }}>
          <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--color-gray-700)' }}>
            Number of Measurement Points
          </label>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {[3, 4, 5].map(num => (
              <Button
                key={num}
                type="button"
                variant={numberOfPoints === num ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setNumberOfPoints(num as 3 | 4 | 5)}
              >
                {num} Points
              </Button>
            ))}
          </div>
        </div>
      </FormSection>

      {/* Calibration Details */}
      <FormSection title="Calibration Details">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormInput
            label="Technician Name"
            value={technicianName}
            onChange={(e) => setTechnicianName(e.target.value)}
            required
            placeholder="Enter technician name"
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)' }}>
            <FormInput
              label="Temperature (°F)"
              type="number"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="68"
            />
            <FormInput
              label="Humidity (%)"
              type="number"
              value={humidity}
              onChange={(e) => setHumidity(e.target.value)}
              placeholder="45"
            />
          </div>
          <div style={{ padding: 'var(--space-2)', backgroundColor: 'var(--color-gray-100)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)' }}>
            <strong>Tolerance Specification:</strong> ±{tolerance} {unit}
          </div>
        </div>
      </FormSection>

      {/* Measurement Points */}
      <FormSection title="Measurement Points">
        {isLoadingBlocks ? (
          <p style={{ textAlign: 'center', color: 'var(--color-gray-600)' }}>Loading gauge blocks...</p>
        ) : loadError ? (
          <div style={{ padding: 'var(--space-4)', border: '2px solid var(--color-danger)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-danger-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <Icon name="alert-circle" size={20} style={{ color: 'var(--color-danger)' }} />
              <h4 style={{ margin: 0, color: 'var(--color-danger)', fontSize: 'var(--font-size-md)', fontWeight: '600' }}>
                Unable to Load Gauge Blocks
              </h4>
            </div>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              {loadError}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={loadSuggestedBlocks}
              style={{ marginTop: 'var(--space-3)' }}
              icon={<Icon name="refresh" />}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {measurementPoints.map((point, index) => (
              <div key={index} style={{ padding: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: point.pass ? 'var(--color-success-light)' : 'var(--color-danger-light)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr auto', gap: 'var(--space-2)', alignItems: 'end' }}>
                  <div style={{ fontWeight: '600', fontSize: 'var(--font-size-sm)', minWidth: '60px' }}>
                    {point.label}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-700)' }}>
                      Reference Block
                    </label>
                    <select
                      value={selectedBlocks[index] || ''}
                      onChange={(e) => handleBlockSelection(index, parseFloat(e.target.value))}
                      style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)' }}
                      required
                    >
                      <option value="">Select block...</option>
                      {availableBlocks.map(block => (
                        <option key={block} value={block}>
                          {block.toFixed(4)} {unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <FormInput
                    label="Actual Reading"
                    type="number"
                    step="0.0001"
                    value={point.actual || ''}
                    onChange={(e) => handleActualValueChange(index, e.target.value)}
                    required
                    placeholder="0.0000"
                  />

                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-700)' }}>
                      Deviation
                    </label>
                    <div style={{ padding: 'var(--space-2)', backgroundColor: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)', fontFamily: 'monospace', textAlign: 'right' }}>
                      {point.deviation >= 0 ? '+' : ''}{point.deviation.toFixed(4)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', fontWeight: '600', fontSize: 'var(--font-size-sm)', color: point.pass ? 'var(--color-success)' : 'var(--color-danger)', minWidth: '50px' }}>
                    {point.pass ? '✓ PASS' : '✗ FAIL'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </FormSection>

      {/* Visual Inspection */}
      <FormSection title="Visual Inspection">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
            {Object.entries({
              no_damage: 'No visible damage',
              clean_condition: 'Clean condition',
              smooth_operation: 'Smooth operation',
              readable_markings: 'Readable markings'
            }).map(([key, label]) => (
              <FormCheckbox
                key={key}
                checked={visualInspection[key as keyof typeof visualInspection] as boolean}
                onChange={(e) => setVisualInspection({ ...visualInspection, [key]: e.target.checked })}
                label={label}
              />
            ))}
          </div>
          <FormTextarea
            label="Inspection Notes (Optional)"
            value={visualInspection.notes}
            onChange={(e) => setVisualInspection({ ...visualInspection, notes: e.target.value })}
            placeholder="Any additional observations..."
            rows={3}
          />
        </div>
      </FormSection>

      {/* Calibration Result */}
      <FormSection title="Calibration Result">
        <div style={{ padding: 'var(--space-4)', border: '2px solid', borderColor: overallPass ? 'var(--color-success)' : 'var(--color-danger)', borderRadius: 'var(--radius-md)', backgroundColor: overallPass ? 'var(--color-success-light)' : 'var(--color-danger-light)', textAlign: 'center' }}>
        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600', color: overallPass ? 'var(--color-success)' : 'var(--color-danger)' }}>
          Overall Result: {overallPass ? '✓ PASS' : '✗ FAIL'}
        </div>
        {!overallPass && (
          <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-danger)' }}>
            Tool will be marked as out of service
          </div>
        )}
        </div>
      </FormSection>

      {/* Form Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border)' }}>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading || !!loadError || isLoadingBlocks}
          icon={isLoading ? <Icon name="spinner" spin /> : <Icon name="check" />}
        >
          {isLoading ? 'Recording...' : 'Record Calibration'}
        </Button>
      </div>
    </form>
  );
}

# Frontend Visual & Pixel-Level Analysis

## Pixel-Perfect UI Differences

### 1. **Header & Navigation Bar**

#### Legacy Frontend:
```css
.main-nav {
  height: 60px;
  background: #2c72d5;
  padding: 0 24px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.nav-brand {
  font-size: 20px;
  font-weight: 600;
  color: white;
}
```
- **Height**: Exactly 60px
- **Shadow**: Subtle 4px shadow
- **Logo**: Left-aligned with 24px padding
- **User Info**: Right-aligned with avatar placeholder

#### Modular Frontend:
```css
/* Tailwind classes */
h-16 bg-blue-600 px-6 shadow-lg
```
- **Height**: 64px (h-16)
- **Shadow**: Larger shadow
- **Logo**: Missing company branding
- **User Info**: Simple text without avatar

**Pixel Difference**: 4px height variance, shadow depth increased by ~8px

### 2. **Summary Cards**

#### Legacy Frontend:
```css
.summary-card {
  min-width: 200px;
  padding: 20px;
  margin: 0 10px 20px 0;
  border-radius: 12px;
  background: white;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}
.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
}
.summary-number {
  font-size: 36px;
  font-weight: 700;
  color: #2c72d5;
}
```
- **Dimensions**: 200px min-width × ~120px height
- **Padding**: Exactly 20px all sides
- **Border Radius**: 12px (more rounded)
- **Hover Effect**: 2px upward translation + shadow enhancement
- **Number Size**: 36px font size

#### Modular Frontend:
```css
/* Tailwind equivalent */
min-w-[180px] p-6 rounded-lg bg-white shadow-md
text-3xl font-bold text-blue-600
```
- **Dimensions**: 180px min-width × ~140px height
- **Padding**: 24px (p-6)
- **Border Radius**: 8px (rounded-lg)
- **Hover Effect**: None
- **Number Size**: 30px (text-3xl)

**Pixel Difference**: 20px width, 20px height, 4px radius, 6px font size

### 3. **Data Table Rows**

#### Legacy Frontend:
```css
.gauge-row {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  transition: background-color 0.2s;
}
.gauge-row:hover {
  background-color: #f8f9fa;
}
.gauge-id {
  font-weight: 600;
  color: #2c72d5;
  margin-right: 12px;
}
.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}
```
- **Row Height**: 56px total (16px padding × 2 + 24px content)
- **Padding**: 16px vertical, 20px horizontal
- **Border**: 1px solid #eee
- **Status Badge**: 20px height, 12px font
- **Hover Color**: #f8f9fa

#### Modular Frontend:
```css
/* Tailwind classes */
flex items-center p-4 border-b border-gray-200
hover:bg-gray-50
px-3 py-1 rounded-full text-xs font-medium
```
- **Row Height**: 64px total (16px padding × 2 + 32px content)
- **Padding**: 16px all sides (p-4)
- **Border**: 1px solid #e5e7eb (border-gray-200)
- **Status Badge**: 22px height, 12px font
- **Hover Color**: #f9fafb (bg-gray-50)

**Pixel Difference**: 8px row height, 4px horizontal padding, slightly lighter borders

### 4. **Modal Overlays**

#### Legacy Frontend:
```css
.modal-overlay {
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: none;
}
.modal-content {
  width: 500px;
  max-height: 80vh;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
}
.modal h2 {
  font-size: 24px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
}
```
- **Overlay**: 50% black opacity, no blur
- **Modal Width**: Fixed 500px
- **Border Radius**: 12px
- **Header Size**: 24px with underline
- **Shadow**: Large 40px spread

#### Modular Frontend:
```css
/* Tailwind implementation */
bg-black bg-opacity-50 backdrop-blur-sm
w-full max-w-lg p-6 rounded-lg shadow-xl
text-2xl mb-4 pb-4 border-b
```
- **Overlay**: 50% black + backdrop blur
- **Modal Width**: Responsive max-w-lg (512px)
- **Border Radius**: 8px
- **Header Size**: 24px (text-2xl) with underline
- **Shadow**: Standard xl shadow (~25px)

**Pixel Difference**: 12px width on desktop, 4px radius, blur effect added

### 5. **Form Inputs**

#### Legacy Frontend:
```css
input[type="text"], select {
  height: 40px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}
input:focus {
  border-color: #2c72d5;
  box-shadow: 0 0 0 3px rgba(44, 114, 213, 0.1);
}
.form-label {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
  color: #333;
}
```
- **Input Height**: 40px
- **Padding**: 8px vertical, 12px horizontal
- **Border Radius**: 4px (sharp)
- **Focus Ring**: 3px light blue
- **Label Margin**: 6px bottom

#### Modular Frontend:
```css
/* Tailwind utilities */
h-10 px-3 py-2 border rounded-md text-sm
focus:ring-2 focus:ring-blue-500 focus:border-blue-500
text-sm font-medium mb-1 text-gray-700
```
- **Input Height**: 40px (h-10)
- **Padding**: 8px vertical, 12px horizontal
- **Border Radius**: 6px (rounded-md)
- **Focus Ring**: 2px solid blue
- **Label Margin**: 4px bottom

**Pixel Difference**: 2px radius increase, 1px focus ring decrease, 2px label margin

### 6. **Button Styles**

#### Legacy Frontend:
```css
.btn-primary {
  height: 36px;
  padding: 0 16px;
  background: #2c72d5;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}
.btn-primary:hover {
  background: #1d5bb8;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}
```
- **Height**: 36px
- **Padding**: 16px horizontal
- **Radius**: 4px
- **Hover**: 1px lift + shadow

#### Modular Frontend:
```css
/* Tailwind button */
h-9 px-4 bg-blue-600 rounded-md text-sm font-medium
hover:bg-blue-700
```
- **Height**: 36px (h-9)  
- **Padding**: 16px (px-4)
- **Radius**: 6px (rounded-md)
- **Hover**: Color change only

**Pixel Difference**: 2px radius increase, missing hover elevation effect

### 7. **Icon Sizing & Spacing**

#### Legacy Frontend:
- **Icon Size**: 16px default, 14px in buttons
- **Icon Margin**: 8px from text
- **Icon Color**: Inherits or specific (#666 for muted)

#### Modular Frontend:
- **Icon Size**: 20px default (w-5 h-5), 16px in buttons
- **Icon Margin**: 12px from text (mr-3)
- **Icon Color**: Usually gray-500 or matching text

**Pixel Difference**: 4px larger icons, 4px more spacing

### 8. **Color Precision**

#### Legacy Exact Colors:
```css
--primary: #2c72d5;      /* RGB: 44, 114, 213 */
--hover: #1d5bb8;        /* RGB: 29, 91, 184 */
--background: #f8f9fa;   /* RGB: 248, 249, 250 */
--border: #dee2e6;       /* RGB: 222, 226, 230 */
--text: #212529;         /* RGB: 33, 37, 41 */
--muted: #6c757d;        /* RGB: 108, 117, 125 */
```

#### Modular Tailwind Colors:
```css
blue-600: #2563eb;       /* RGB: 37, 99, 235 */
blue-700: #1d4ed8;       /* RGB: 29, 78, 216 */
gray-50: #f9fafb;        /* RGB: 249, 250, 251 */
gray-200: #e5e7eb;       /* RGB: 229, 231, 235 */
gray-900: #111827;       /* RGB: 17, 24, 39 */
gray-500: #6b7280;       /* RGB: 107, 114, 128 */
```

**Color Differences**:
- Primary blue: 7 units more red, 15 units less green, 22 units more blue
- Background: 1 unit more red, 1 unit more green, 1 unit more blue
- Borders: 7 units more red, 5 units more green, 5 units more blue

## Critical Visual Misalignments

1. **Navigation Height**: 4px taller in modular (breaks muscle memory)
2. **Summary Cards**: Missing hover interaction (reduces discoverability)  
3. **Row Density**: 8px taller rows (14% less data visible)
4. **Modal Radius**: 4px less rounded (brand inconsistency)
5. **Focus States**: Different ring styles (accessibility concern)
6. **Color Temperature**: Cooler blues in modular (brand deviation)

## Recommendations for Pixel-Perfect Parity

1. **Immediate CSS Variables**:
   ```css
   :root {
     --nav-height: 60px;
     --card-radius: 12px;
     --row-padding: 16px 20px;
     --primary-exact: #2c72d5;
   }
   ```

2. **Tailwind Config Override**:
   ```js
   colors: {
     'brand-blue': '#2c72d5',
     'brand-blue-hover': '#1d5bb8'
   }
   ```

3. **Component Height Standardization**:
   - Navigation: Exactly 60px
   - Table rows: Exactly 56px  
   - Inputs: Exactly 40px
   - Buttons: Exactly 36px

4. **Restore Hover Interactions**:
   - Summary cards: 2px lift
   - Buttons: 1px lift + shadow
   - Table rows: Exact #f8f9fa background
---
name: Aetherial Precision
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#0058be'
  on-secondary: '#ffffff'
  secondary-container: '#2170e4'
  on-secondary-container: '#fefcff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002113'
  on-tertiary-container: '#009668'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  slate-900: '#0F172A'
  blue-600: '#2563EB'
  emerald-500: '#10B981'
  surface-glass: rgba(255, 255, 255, 0.7)
  border-subtle: rgba(15, 23, 42, 0.08)
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 16px
---

## Brand & Style
The design system is built for high-growth technology and SaaS platforms that prioritize clarity, technical authority, and a refined user experience. The brand personality is **sophisticated, precise, and visionary**, aiming to evoke a sense of calm efficiency and forward-thinking reliability.

We utilize a **Modern Minimalist** style infused with **Glassmorphism** for depth. The aesthetic relies on expansive white space, razor-sharp typography, and subtle translucent layers that suggest a multi-dimensional interface without overwhelming the user. It is designed to feel like a high-end digital tool: functional enough for power users, yet elegant enough for executive-level reporting.

## Colors
The palette is rooted in a "Deep Slate" primary for high-contrast text and structural elements, ensuring accessibility and authority. The "Electric Blue" secondary serves as the main action color, while "Emerald" provides a positive semantic anchor for success states and growth metrics.

The background is a crisp "Off-White" to reduce eye strain. We employ a glass-like transparency for overlays and navigation bars, allowing the background to bleed through slightly, which creates a sense of spatial awareness. High-saturation colors are used sparingly for calls to action, while the rest of the interface remains intentionally desaturated to keep focus on the content.

## Typography
The typographic hierarchy uses **Hanken Grotesk** for headlines to provide a sharp, contemporary look that feels engineered. **Inter** is used for body copy due to its exceptional legibility in data-heavy contexts. For metadata, code snippets, and technical labels, **JetBrains Mono** provides a functional, developer-friendly contrast.

On mobile, display sizes scale down by approximately 25% to maintain readable line lengths. Use "Label-Caps" for section headers and small navigational cues to differentiate them from interactive body text.

## Layout & Spacing
This design system utilizes a **fixed-fluid hybrid grid**. Content is constrained to a 1280px max-width container on desktop to maintain readability, while utilizing a 12-column fluid grid within that container. 

Spacing is based on an **8px linear scale**.
- **Desktop:** 12 columns, 24px gutters, 40px side margins.
- **Tablet:** 8 columns, 16px gutters, 24px side margins.
- **Mobile:** 4 columns, 16px gutters, 16px side margins.

Horizontal spacing should prioritize grouping related items through proximity, while vertical spacing should be generous to maintain the minimalist "breathable" feel.

## Elevation & Depth
Depth is communicated through **Tonal Layers** combined with **Backdrop Blurs**. We avoid heavy drop shadows in favor of subtle "ambient" shadows that use a tint of the primary color (`#0F172A`) at very low opacity (4-8%).

- **Level 0 (Base):** Neutral background.
- **Level 1 (Cards):** White surface with a 1px `border-subtle`. No shadow.
- **Level 2 (Dropdowns/Modals):** `surface-glass` with a 12px backdrop-blur and a soft 16px ambient shadow.
- **Level 3 (Floating Actions):** White surface with a more pronounced 24px shadow to indicate high interactivity.

## Shapes
The design system uses **Rounded** geometry. A base radius of 0.5rem (8px) provides a friendly yet professional balance. 

- **Standard Buttons & Inputs:** 8px (0.5rem).
- **Cards & Large Containers:** 16px (1rem).
- **Status Chips & Tags:** Full pill-shape to distinguish them from interactive buttons.
- **Icon Enclosures:** 25% squircle for a custom, premium feel.

## Components

### Buttons
Primary buttons use the `secondary_color_hex` (Blue) with white text. Secondary buttons use a ghost style (transparent fill, `border-subtle`) with primary-colored text. All buttons have a subtle 200ms transition on hover, shifting the background brightness slightly.

### Inputs
Fields use a solid white background with a 1px border. On focus, the border transitions to the primary blue with a 3px soft outer "glow" (box-shadow) in a translucent version of the same blue. Labels use `body-sm` in a bold weight.

### Cards
Cards are the primary container. They should be flat with a 1px `border-subtle`. For interactive cards, add a slight lift (Level 2 elevation) on hover.

### Chips & Badges
Small, pill-shaped elements used for categorization. Use low-saturation background tints (e.g., 10% opacity of the semantic color) with high-saturation text of the same hue to ensure legibility.

### Lists
Data lists should use subtle dividers (1px) and generous vertical padding (16px). For interactive list items, use a background color change (`neutral_color_hex`) instead of a shadow.

### Navigation
The sidebar or top-nav should utilize `surface-glass` effects when scrolled, ensuring that the content behind it is blurred but visible to maintain context.
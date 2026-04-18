# Design System Documentation: The Ethereal Canvas

## 1. Overview & Creative North Star: "The Digital Curator"
This design system is built upon the philosophy of **The Digital Curator**. It moves away from the rigid, boxy constraints of traditional web interfaces toward an editorial, atmospheric experience. Inspired by premium industrial design and high-end editorial layouts, the system prioritizes "Negative Space as a Feature." 

The goal is to create a sense of weightlessness. By utilizing heavy glassmorphism, intentional asymmetry, and a "No-Line" architecture, we guide the user’s eye through content hierarchy rather than structural containment. The interface should feel like a series of translucent layers floating in a bright, airy gallery.

### Key Tenets:
*   **Atmospheric Depth:** Use backdrop blurs to create a sense of place.
*   **Soft Minimalism:** Every element must earn its place; if a border can be replaced by white space, it must be removed.
*   **Bilingual Precision:** Typography is tuned for the visual density of Simplified Chinese characters alongside the rhythmic flow of Latin script.

---

## 2. Color & Surface Architecture
The palette is rooted in a "High-Value Neutral" logic. We avoid pure blacks and harsh grays in favor of tinted neutrals that feel "expensive."

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections. Boundaries are created exclusively through:
1.  **Tonal Shifts:** Placing a `surface-container-low` element against a `surface` background.
2.  **Negative Space:** Using generous padding to define the "edge" of a content block.
3.  **Refraction:** Using glassmorphism to "break" the background.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of frosted glass sheets. 
*   **Base:** `surface` (#f9f9fe) serves as the infinite canvas.
*   **Level 1 (Sub-sections):** Use `surface-container-low` (#f3f3f8) for large structural areas.
*   **Level 2 (Interactive Cards):** Use `surface-container-lowest` (#ffffff) for high-priority cards to make them "pop" against the lower-tier backgrounds.
*   **Glass Accents:** Use `primary` (#0058bc) at 5-10% opacity with a `20px` backdrop-blur for floating navigation or overlays.

### Signature Textures
For Primary CTAs and Hero sections, do not use flat colors. Apply a subtle linear gradient:
*   **Direction:** 135deg
*   **From:** `primary_container` (#0070eb)
*   **To:** `primary` (#0058bc)
This adds a "specular highlight" effect reminiscent of high-end glass hardware.

---

## 3. Typography: Editorial Bilingualism
The system uses a unified scale for Inter and Simplified Chinese (fallback to PingFang SC/Microsoft YaHei). Simplified Chinese requires slightly more leading (line-height) to maintain readability at smaller scales.

*   **Display (Display-LG/MD):** Used for "Hero" moments. Use `display-lg` (3.5rem) with `-0.02em` letter spacing for a tight, premium feel.
*   **Headlines (Headline-LG/MD):** The primary drivers of the "Digital Curator" look. Always use `on_surface` (#1a1c1f) with a bold weight.
*   **Body (Body-LG/MD):** For Simplified Chinese, ensure `line-height` is at least `1.6` to prevent character crowding.
*   **Hierarchy Tip:** Contrast `display-md` (Primary Blue) with `label-md` (Secondary Gray) to create an immediate focal point without using heavy weights.

---

## 4. Elevation & Depth
Depth in this system is "Ambient," not "Structural." 

### The Layering Principle
Instead of shadows, use **Tonal Layering**. Place a `surface_container_highest` (#e2e2e7) element behind a `surface_container_lowest` (#ffffff) card. The delta in luminance creates a natural edge.

### Ambient Shadows
When an element must float (e.g., a Modal or Popover):
*   **Color:** Use a 6% opacity version of `on_surface` (#1a1c1f) tinted with 2% `primary`.
*   **Blur:** Minimum `40px` to `80px`.
*   **Spread:** `-10px` to keep the shadow tucked "under" the object, mimicking overhead studio lighting.

### Glassmorphism & Ghost Borders
For floating headers or sidebars:
*   **Background:** `surface` at 70% opacity.
*   **Backdrop Filter:** `blur(20px) saturate(180%)`.
*   **The Ghost Border:** If an edge is needed for accessibility, use `outline_variant` at **15% opacity**. This creates a "specular edge" rather than a hard line.

---

## 5. Components

### Buttons
*   **Primary:** Gradient (`primary_container` to `primary`), `rounded-full`, white text. No shadow on idle; `8%` ambient shadow on hover.
*   **Secondary:** `surface_container_high` background. Text in `primary`.
*   **Tertiary/Ghost:** No background. Text in `primary`. Use a subtle `surface_variant` background shift on hover.

### Cards & Lists
*   **The Card Rule:** Forbid divider lines. Separate list items using `12px` of vertical margin or a subtle background shift to `surface_container_low` on hover. 
*   **Radius:** Always use `rounded-lg` (2rem) for cards and `rounded-md` (1.5rem) for nested elements.

### Input Fields
*   **State:** Unfocused inputs should be `surface_container_highest` with no border. 
*   **Focus State:** Transition to `surface_container_lowest` with a `2px` `primary` "Ghost Border" (20% opacity).

### Bilingual Tooltips
*   **Styling:** `inverse_surface` (#2e3034) with `90%` opacity and `12px` blur.
*   **Text:** `on_surface_variant` (#414755) in `label-sm`.

---

## 6. Do’s and Don’ts

### Do:
*   **Use Asymmetry:** Place a large `display-lg` headline off-center to create an editorial feel.
*   **Embrace Large Radii:** Stick to the `xl` (3rem) and `lg` (2rem) tokens for main containers to mimic Apple’s hardware aesthetics.
*   **Prioritize Chinese Readability:** When using Simplified Chinese, increase the `tracking` (letter-spacing) by `0.01em` compared to Latin text to prevent visual "clumping."

### Don’t:
*   **Never use 100% Opaque Borders:** This destroys the "glass" illusion.
*   **Avoid Flat Grays:** Always ensure grays have a hint of blue/cool tint from the `primary` palette to keep the "crisp" feel.
*   **Don't Over-Stack:** Limit glass layers to two. Any more will cause "blur-stacking" which degrades performance and legibility.
*   **No Hard Shadows:** Never use a shadow with less than `20px` blur. If it looks like a "drop shadow," it is wrong. It should look like an "aura."

---

## 7. Roundedness Scale Reference
*   **Container/Page:** `xl` (3rem)
*   **Cards/Modals:** `lg` (2rem)
*   **Buttons/Inputs:** `full` (9999px) or `md` (1.5rem)
*   **Inner Elements:** `sm` (0.5rem)
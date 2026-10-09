---
name: professional-ui-design
description: Design, implement, review, and refine polished, accessible, responsive web interfaces using sound UI/UX principles rather than vague "make it modern" styling. Use when building a new screen, improving an existing interface, translating a screenshot or design reference into code, or reviewing UI quality.
---

# Professional UI Design

## Purpose

Create interfaces that feel intentional, coherent, usable, and production-ready. Make the product's primary task easy to understand and complete. Use design references to learn principles, not to blindly copy another product's appearance.

A polished interface is not merely a collection of attractive cards, gradients, and animations. It has a clear information hierarchy, consistent visual rules, meaningful states, accessible interactions, and a layout suited to the user's task and device.

## When to Use This Skill

Use this skill when asked to:

- Design or redesign a page, dashboard, form, landing page, or application screen.
- Improve the visual quality of an existing application.
- Implement a screenshot, mockup, or visual reference.
- Review why an interface feels unfinished, generic, cluttered, or "vibe coded."
- Establish or improve a design system and reusable UI components.
- Make an interface responsive, accessible, or more consistent.

Do not assume that every request requires a complete redesign. Prefer the smallest coherent set of changes that solves the problem.

## Core Principles

### 1. Design for the product's job

- Identify the primary user, their goal, and the key action they need to perform.
- Make the primary task prominent; keep secondary information secondary.
- Choose layouts and interactions that suit the product. A dashboard, chat app, security scanner, admin table, and mobile utility have different needs.
- Treat references such as Apple's interfaces or Claude's visual style as inspiration for specific qualities, not templates to copy wholesale.
- Preserve established product behavior, terminology, and brand choices unless the task calls for changing them.

### 2. Establish clear visual hierarchy

- Decide what the user should notice first, second, and third.
- Use position, grouping, typography, spacing, contrast, and size to express importance.
- Group information that belongs together and separate unrelated content.
- Use headings that describe the content or action, not vague labels.
- Do not make every section, card, metric, or button equally prominent.
- Avoid adding cards around every element. Use open space, dividers, alignment, and background changes when those communicate structure more simply.

### 3. Use space and layout deliberately

- Inspect the actual target viewport and expected device sizes before deciding the layout.
- Use a coherent grid, consistent alignment, and a purposeful content width. Do not place a narrow column in the center of a wide desktop by accident.
- Use whitespace to group, separate, and emphasize content; do not fill empty space with decorative elements without a reason.
- Prefer simple, understandable layouts over complicated arrangements.
- On smaller screens, preserve task order and readability. Reflow columns, controls, tables, and navigation instead of simply shrinking the desktop design.
- Use a consistent spacing scale (for example, increments based on 4px or 8px) rather than choosing unrelated margins and padding for every element.
- Avoid horizontal overflow, clipped controls, and layouts that only work at one screen width.

### 4. Make typography readable and consistent

- Use a small, intentional type scale for page titles, section headings, body text, labels, helper text, and metadata.
- Use a readable font size and line height. Avoid using tiny text to fit too much information into a panel.
- Make headings, labels, values, and supporting explanations visibly distinct.
- Keep line lengths comfortable for reading and use text wrapping appropriately.
- Use font weight and size purposefully; do not rely on bolding every label to create hierarchy.
- Use the project's current typography choices when they are sound. Do not add fonts or font-loading dependencies without a good reason.

### 5. Define a small, consistent visual system

Before styling many separate elements, establish reusable choices for:

- Brand and neutral colors.
- Semantic colors for success, warning, error, and informational states.
- Typography sizes, weights, and line heights.
- Spacing and layout widths.
- Border colors, radii, and elevation/shadows.
- Focus, hover, active, disabled, loading, and error states.

Prefer design tokens or shared variables over scattered one-off values. Reuse the project's existing tokens and components where practical. Add new tokens only when they improve consistency.

Use accent colors sparingly and with purpose. Do not depend on color alone to communicate status; pair color with text, an icon, or another cue. Avoid excessive gradients, glows, saturated borders, and shadows unless they are part of a deliberate product identity.

### 6. Build reusable components without flattening every screen into the same template

- Reuse components for repeated behavior and appearance: buttons, form fields, badges, alerts, dialogs, cards, navigation, and status displays.
- Keep component APIs understandable and avoid creating abstractions for one-off elements without a clear benefit.
- Make component variants explicit when they represent meaningful differences, such as primary, secondary, destructive, success, or compact.
- Keep page-specific information architecture in the page rather than forcing every page into a generic dashboard layout.
- Prefer the project's existing component library and styling method. Do not install a new framework or component library merely to improve one screen.
- If the project already uses a design system, extend it before introducing a competing one.

### 7. Make every interaction understandable

- Every visible button or clickable control must perform its advertised action or clearly be disabled.
- Use action-specific labels such as "Scan message" or "Save changes" instead of vague labels when appropriate.
- Provide visible focus states for keyboard users and clear hover/pressed states for pointer users.
- Show loading, success, empty, validation, failure, and disabled states when they are relevant to the workflow.
- Explain validation errors close to the relevant field and tell users how to fix them when possible.
- Avoid interactions that unexpectedly change layout or remove information before the user understands what happened.
- Respect reduced-motion preferences and avoid unnecessary animation.

### 8. Treat accessibility as part of visual quality

- Use semantic HTML and the correct native controls wherever practical.
- Ensure form fields have programmatic labels, controls have accessible names, and icons with meaning have accessible text.
- Preserve keyboard navigation and visible focus indicators.
- Do not use color alone to communicate risk, success, or failure.
- Aim for WCAG AA contrast: generally at least 4.5:1 for normal text and 3:1 for large text.
- Check text resizing, zoom, responsive behavior, and reduced motion.
- Use appropriate heading order and landmarks; avoid clickable non-interactive elements that imitate buttons.
- Do not remove native interaction behavior unless an accessible replacement is provided.

### 9. Make data, status, and confidence honest

- Preserve the source of truth and existing product logic unless explicitly asked to change it.
- Never invent real metrics, model outputs, ratings, testimonials, or success states to make a screen look convincing.
- Make uncertainty visible when the underlying system is uncertain. Labels, colors, and recommendations must match the actual data and decision thresholds.
- Distinguish diagnostic or developer information from information intended for ordinary users.
- Make warnings actionable and proportionate. Do not use dramatic styling to overstate a weak signal.

### 10. Optimize for coherence, not decoration

- Prefer a few deliberate design decisions over many ornamental effects.
- Do not add icons, badges, charts, dividers, illustrations, or animation unless they improve recognition, navigation, comprehension, or brand expression.
- Avoid generic "AI dashboard" styling where every section is a rounded card with a gradient and a large number.
- Avoid mixing unrelated visual styles, icon families, radius sizes, border treatments, and typography conventions.
- A simple interface is not automatically good; it still needs hierarchy, adequate affordances, clear states, and enough context for the task.

## Required Workflow

Follow these steps in order. Adapt the depth to the size of the task.

### Step 1: Inspect before changing code

When working in an existing repository:

1. Inspect the relevant page, component tree, routing, and styles.
2. Identify the framework, styling approach, existing component library, and design tokens.
3. Identify the current behavior that must remain unchanged.
4. Review any user-provided screenshots or reference designs.
5. Avoid unrelated refactors and do not replace the stack just to achieve a visual change.

If the repository or running app is unavailable, state what cannot be inspected and proceed only from the available information.

### Step 2: Understand the user and primary task

Briefly determine:

- Who uses this screen?
- What are they trying to achieve?
- What is the primary action?
- What information must be visible immediately?
- What is secondary, optional, or mainly for developers?
- Which screen sizes and input methods need support?

Ask a focused clarification only when missing information materially changes the design. Otherwise, state reasonable assumptions and proceed.

### Step 3: Diagnose the current interface

Look for the highest-impact problems first:

- Unclear information hierarchy.
- Unintentional content width or alignment.
- Inconsistent spacing or typography.
- Too many equally prominent cards, borders, or accents.
- Weak or ambiguous action labels.
- Inputs that look unstyled or do not communicate their state.
- Missing loading, error, empty, or success states.
- Poor responsive behavior or accessibility barriers.
- Claims, confidence labels, or visual status that do not match actual data.

Prioritize problems by user impact. Do not spend time on decorative polish while the main task remains confusing.

### Step 4: Choose a clear design direction

Before implementation, define a short design brief covering:

- The interface's primary goal.
- Layout and content hierarchy.
- Typography and spacing approach.
- Brand, neutral, and semantic colors.
- Component patterns to reuse.
- Mobile/responsive behavior.

Use supplied references selectively. Explain the design reasoning when useful, and do not assume that a familiar visual style is automatically appropriate.

### Step 5: Implement incrementally

- Improve the page structure and hierarchy before adding decorative polish.
- Use semantic elements and existing project components when practical.
- Reuse design tokens and create shared components for repeated patterns.
- Keep business logic separate from presentation where the existing architecture allows it.
- Preserve existing data flow and working behavior.
- Avoid unnecessary dependencies, oversized rewrites, duplicate CSS, and hard-coded per-element style exceptions.
- Do not leave placeholder buttons or fake data in a finished deliverable. If a feature is intentionally nonfunctional, make the limitation explicit.

### Step 6: Review responsive and interaction states

At minimum, consider:

- Wide desktop.
- Typical laptop or tablet width.
- Narrow mobile width.
- Long and short content.
- Loading and empty states.
- Success, warning, uncertain, and failure states where relevant.
- Keyboard focus and disabled controls.

Do not only test the ideal case with short text and perfect data.

### Step 7: Verify the result

When the environment supports it:

1. Run the relevant checks or app.
2. Inspect the rendered result at representative viewport sizes.
3. Look for overflow, awkward wrapping, inconsistent spacing, low contrast, alignment issues, and hidden actions.
4. Test important interactions rather than judging a static screenshot alone.
5. Make a small number of targeted refinements and recheck them.

Be truthful about verification. Do not claim to have run the app, viewed a browser screenshot, tested accessibility, or passed tests unless that actually happened. If visual inspection tools are unavailable, explain which checks remain unverified.

### Step 8: Summarize the changes

When implementation is complete, report briefly:

- The most important design improvements.
- Any important behavior preserved or changed.
- Verification actually performed.
- Known limitations or follow-up work.

Do not claim that the UI is "professional" merely because it has been restyled. Describe the concrete improvements instead.

## Product-Specific Example: Message or Scam Scanner

For a message-scanning product such as SmishGuard, a sensible default hierarchy is:

1. Product identity and concise privacy/status information.
2. Message input, character count, examples, and one primary scan action.
3. Result verdict and calibrated confidence or uncertainty.
4. Short explanation of the result and a clear recommended next action.
5. Detailed category scores or model evidence, when useful.
6. Developer diagnostics such as inference latency, network calls, and local correction counts.

Keep developer metrics available for demos or debugging, but do not let them compete with the primary user task. Make clear whether a result comes from model inference, a rule-based check, or another mechanism. Avoid describing a borderline score as highly certain unless the product's validated decision policy supports that language.

This is an example, not a universal layout. Adapt the hierarchy to the real product and its users.

## Anti-Patterns to Avoid

- Starting implementation with only the instruction "make it modern" and no design reasoning.
- Copying an Apple, Claude, or other product screen without adapting it to the target task.
- Styling every section as a card by default.
- Using gradients, shadows, glow effects, pills, and badges as substitutes for hierarchy.
- Using several unrelated spacing scales, icon styles, radius values, or accent colors.
- Making desktop content excessively narrow or allowing it to stretch without readable limits.
- Shrinking desktop content on mobile instead of redesigning the layout responsively.
- Hiding essential actions behind unclear icons or ambiguous labels.
- Using color as the only signal for success, warning, or danger.
- Showing misleading confidence, fake metrics, or unsupported status claims.
- Adding a UI dependency without checking the existing stack and project conventions.
- Rewriting working application logic when the task only requires visual improvements.
- Claiming visual or functional verification that was not performed.

## Definition of Done

Before considering a UI task complete, check each applicable item:

- [ ] The main user goal and primary action are immediately understandable.
- [ ] The page has a clear hierarchy and purposeful content grouping.
- [ ] Content width, alignment, and whitespace appear intentional.
- [ ] Typography is readable and follows a consistent scale.
- [ ] Spacing, colors, borders, radii, and component styles are consistent.
- [ ] Primary, secondary, destructive, and status styles are used appropriately.
- [ ] Inputs, buttons, links, and controls have clear labels and meaningful states.
- [ ] Loading, empty, error, success, or uncertainty states are handled where relevant.
- [ ] The layout works at expected desktop and mobile widths.
- [ ] Keyboard navigation, focus visibility, semantic structure, and contrast have been considered.
- [ ] The visual status and wording match the underlying data and system behavior.
- [ ] Existing functionality has been preserved unless a behavior change was requested.
- [ ] The app and relevant interactions have been checked to the extent tools allow.
- [ ] Any unverified items or known limitations are disclosed.

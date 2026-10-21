---
version: alpha
name: Apple TV Glassmorphism
description: A refined, dark frosted-glass design system tailored for tvhub TV fleet control.
colors:
  primary: "#0071E3"
  primary-hover: "#0077ED"
  background: "#0B0C10"
  surface: "#181922"
  surface-glass: "rgba(24, 25, 34, 0.72)"
  border: "rgba(255, 255, 255, 0.12)"
  border-highlight: "rgba(255, 255, 255, 0.28)"
  text-primary: "#F5F5F7"
  text-secondary: "#A1A1A6"
  text-muted: "#6E6E73"
  success: "#30D158"
  warning: "#FF9F0A"
  danger: "#FF453A"
typography:
  headline-lg:
    fontFamily: Outfit, -apple-system, sans-serif
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Outfit, -apple-system, sans-serif
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  body-md:
    fontFamily: Outfit, -apple-system, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
  label-sm:
    fontFamily: Outfit, -apple-system, sans-serif
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.04em
rounded:
  sm: 8px
  md: 14px
  lg: 20px
  xl: 28px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
---

# Apple TV Glassmorphism Design System

## Overview
tvhub is a centralized hub and fleet manager for Android TVs running the custom Apple TV 4K launcher. The design system emphasizes depth, frosted translucency (glassmorphism), ultra-clean typographic hierarchy, and seamless remote interactions.

## Colors
The palette is built on deep obsidian dark tones (`#0B0C10`), elevated by frosted charcoal glass surfaces (`rgba(24, 25, 34, 0.72)`) and illuminated with Apple Blue (`#0071E3`) accents and emerald status lights (`#30D158`).

## Typography
Clean, geometric humanist typography powered by **Outfit** and Apple system font fallbacks, ensuring legible contrast at distance on both desktop browsers and mobile companion screens.

## Elevation & Depth
Elevation is conveyed through translucent frosted glass panels with specular top highlights (`rgba(255, 255, 255, 0.28)`) and soft ambient backdrops rather than muddy drop-shadows.

## Shapes
All cards and controller pills feature generous, continuous corner radiuses (`14px` for buttons, `20px` to `28px` for panels and remote D-Pads), mimicking the tactile industrial design of the Siri Remote.

## Components
- **Pill Badges**: Translucent chips with micro indicator dots for live device health and mDNS signals.
- **Glass Sliders**: Accent-colored range controls with continuous gradient sheen.
- **D-Pad Controller**: Circular satin-dark navigation pad with haptic spring-feel feedback.
- **App Launch Grid**: Interactive compact cards with instant launch triggers.

## Do's and Don'ts
- **Do** maintain translucent layers so wallpaper artwork and glass aesthetics remain cohesive.
- **Do** use specular white top borders to simulate authentic glass edge reflections.
- **Don't** use opaque muddy gray backgrounds.
- **Don't** use harsh saturated neon accents outside of functional status badges.

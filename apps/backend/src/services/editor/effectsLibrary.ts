/**
 * Effects Library Service
 * Provides visual effects for SVG elements (shadows, glows, borders)
 *
 * Option 1: SVG filters (pros: native support, scalable; cons: complex syntax)
 * Option 2: CSS filters (pros: simpler; cons: limited browser support for SVG)
 * Chosen: SVG filters for broader compatibility and more control
 */

export interface ShadowEffect {
  type: 'shadow';
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
  opacity: number;
}

export interface GlowEffect {
  type: 'glow';
  blur: number;
  color: string;
  intensity: number;
}

export interface BorderEffect {
  type: 'border';
  width: number;
  color: string;
  opacity: number;
}

export interface BlurEffect {
  type: 'blur';
  amount: number;
}

export type Effect = ShadowEffect | GlowEffect | BorderEffect | BlurEffect;

export class EffectsLibrary {
  private filterIdCounter = 0;

  /**
   * Apply a drop shadow effect to an SVG element
   */
  public applyShadow(svgContent: string, effect: ShadowEffect): string {
    const filterId = `shadow-${this.generateFilterId()}`;
    const filterDef = this.createShadowFilter(filterId, effect);

    return this.injectFilter(svgContent, filterId, filterDef);
  }

  /**
   * Apply a glow effect to an SVG element
   */
  public applyGlow(svgContent: string, effect: GlowEffect): string {
    const filterId = `glow-${this.generateFilterId()}`;
    const filterDef = this.createGlowFilter(filterId, effect);

    return this.injectFilter(svgContent, filterId, filterDef);
  }

  /**
   * Apply a border (stroke) effect to SVG paths
   */
  public applyBorder(svgContent: string, effect: BorderEffect): string {
    // For borders, we modify the stroke attributes directly
    const borderStyle = `stroke="${effect.color}" stroke-width="${effect.width}" stroke-opacity="${effect.opacity}"`;

    // Add stroke to all path elements
    const modified = svgContent.replace(/<path([^>]*)>/g, (match, attrs) => {
      // Only add if no stroke exists
      if (!attrs.includes('stroke=')) {
        return `<path${attrs} ${borderStyle}>`;
      }
      return match;
    });

    return modified;
  }

  /**
   * Apply a blur effect
   */
  public applyBlur(svgContent: string, effect: BlurEffect): string {
    const filterId = `blur-${this.generateFilterId()}`;
    const filterDef = this.createBlurFilter(filterId, effect);

    return this.injectFilter(svgContent, filterId, filterDef);
  }

  /**
   * Apply multiple effects in sequence
   */
  public applyEffects(svgContent: string, effects: Effect[]): string {
    let result = svgContent;

    for (const effect of effects) {
      switch (effect.type) {
        case 'shadow':
          result = this.applyShadow(result, effect);
          break;
        case 'glow':
          result = this.applyGlow(result, effect);
          break;
        case 'border':
          result = this.applyBorder(result, effect);
          break;
        case 'blur':
          result = this.applyBlur(result, effect);
          break;
      }
    }

    return result;
  }

  /**
   * Create preset effects
   */
  public getPresets(): Record<string, Effect[]> {
    return {
      'soft-shadow': [
        {
          type: 'shadow',
          offsetX: 2,
          offsetY: 2,
          blur: 4,
          color: '#000000',
          opacity: 0.3,
        },
      ],
      'hard-shadow': [
        {
          type: 'shadow',
          offsetX: 5,
          offsetY: 5,
          blur: 0,
          color: '#000000',
          opacity: 0.5,
        },
      ],
      'neon-glow': [
        {
          type: 'glow',
          blur: 10,
          color: '#00ffff',
          intensity: 2,
        },
      ],
      'warm-glow': [
        {
          type: 'glow',
          blur: 8,
          color: '#ff6b00',
          intensity: 1.5,
        },
      ],
      outline: [
        {
          type: 'border',
          width: 2,
          color: '#000000',
          opacity: 1,
        },
      ],
      'subtle-blur': [
        {
          type: 'blur',
          amount: 1,
        },
      ],
    };
  }

  // Private helper methods

  private generateFilterId(): string {
    return `${this.filterIdCounter++}-${Date.now()}`;
  }

  private createShadowFilter(filterId: string, effect: ShadowEffect): string {
    return `
      <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="${effect.blur}" />
        <feOffset dx="${effect.offsetX}" dy="${effect.offsetY}" result="offsetblur" />
        <feFlood flood-color="${effect.color}" flood-opacity="${effect.opacity}" />
        <feComposite in2="offsetblur" operator="in" />
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    `.trim();
  }

  private createGlowFilter(filterId: string, effect: GlowEffect): string {
    return `
      <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="${effect.blur}" result="blur" />
        <feFlood flood-color="${effect.color}" flood-opacity="${effect.intensity}" />
        <feComposite in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    `.trim();
  }

  private createBlurFilter(filterId: string, effect: BlurEffect): string {
    return `
      <filter id="${filterId}">
        <feGaussianBlur in="SourceGraphic" stdDeviation="${effect.amount}" />
      </filter>
    `.trim();
  }

  private injectFilter(svgContent: string, filterId: string, filterDef: string): string {
    // Check if <defs> exists
    const hasDefsMatch = svgContent.match(/<defs[^>]*>/);

    let modified: string;

    if (hasDefsMatch) {
      // Insert filter into existing <defs>
      modified = svgContent.replace(/<defs[^>]*>/, (match) => `${match}\n${filterDef}`);
    } else {
      // Create <defs> section after <svg>
      modified = svgContent.replace(
        /<svg([^>]*)>/,
        (match) => `${match}\n<defs>\n${filterDef}\n</defs>`,
      );
    }

    // Apply filter to all paths and shapes
    modified = modified.replace(
      /<(path|rect|circle|ellipse|polygon|polyline)([^>]*?)>/g,
      (match, tag, attrs) => {
        if (!attrs.includes('filter=')) {
          return `<${tag}${attrs} filter="url(#${filterId})">`;
        }
        return match;
      },
    );

    return modified;
  }
}

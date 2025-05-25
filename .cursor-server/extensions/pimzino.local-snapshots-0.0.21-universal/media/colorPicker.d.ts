/**
 * Declaration file for the ColorPicker component
 */

interface ColorPickerOptions {
    onChange?: (color: string) => void;
}

interface HSLColor {
    h: number;
    s: number;
    l: number;
}

declare class ColorPicker {
    /**
     * Creates a new ColorPicker instance
     * @param initialColor - Initial color in hex format (e.g., #FFD700)
     * @param onChange - Callback when color changes
     * @param realTimeUpdates - Whether to update in real-time during color selection
     */
    constructor(initialColor: string, onChange: (color: string) => void, realTimeUpdates?: boolean);

    /**
     * The current color in HSL format
     */
    color: HSLColor;

    /**
     * Callback function when color changes
     */
    onChange: (color: string) => void;

    /**
     * The DOM element containing the color picker
     */
    element: HTMLElement | null;

    /**
     * Whether the color picker popup is open
     */
    isOpen: boolean;

    /**
     * Creates the color picker UI
     * @returns The color picker container element
     */
    create(): HTMLElement;

    /**
     * Toggles the color picker popup
     */
    togglePopup(): void;

    /**
     * Closes the color picker popup
     */
    closePopup(): void;

    /**
     * Updates the UI to reflect the current color
     */
    updateUI(): void;

    /**
     * Sets the color from a hex string
     * @param hex - Hex color string
     */
    setColorFromHex(hex: string): void;

    /**
     * Converts a hex color string to HSL
     * @param hex - Hex color string
     * @returns HSL color object
     */
    hexToHsl(hex: string): HSLColor;

    /**
     * Converts an HSL color object to a hex string
     * @param hsl - HSL color object
     * @returns Hex color string
     */
    hslToHex(hsl: HSLColor): string;
}

declare class ColorPickerComponent {
    /**
     * Creates a new color picker component attached to an input element
     * @param inputElement - The input element to attach the color picker to
     * @param onChange - Callback when color changes
     * @param realTimeUpdates - Whether to update in real-time during color selection
     */
    static create(inputElement: HTMLInputElement, onChange: (color: string) => void, realTimeUpdates?: boolean): HTMLElement;
}

// Extend the Window interface to include ColorPicker and ColorPickerComponent
interface Window {
    ColorPicker: typeof ColorPicker;
    ColorPickerComponent: typeof ColorPickerComponent;
}

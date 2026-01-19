#!/usr/bin/env python3
"""
Crop and resize a PNG image to 1024x1024 square.
Handles images of any size and aspect ratio.
"""

import argparse
import sys
from pathlib import Path
from PIL import Image


def crop_and_resize_image(
    input_path: str,
    output_path: str = None,
    size: int = 1024,
    background_color: tuple = (255, 255, 255),
) -> None:
    """
    Crop and resize an image to a square.
    
    Args:
        input_path: Path to the input PNG image
        output_path: Path to save the output image (defaults to input_path with _square suffix)
        size: Target square size in pixels (default: 1024)
        background_color: RGB tuple for background if image is smaller than target
    """
    try:
        # Open the image
        img = Image.open(input_path)
        print(f"Original image size: {img.size}")
        
        # Convert to RGB if needed (handles RGBA, etc.)
        if img.mode != "RGB":
            img = img.convert("RGB")
        
        # Get dimensions
        width, height = img.size
        
        # Calculate the square dimension (use the smaller of width/height)
        square_size = min(width, height)
        
        # Calculate crop box to center the crop
        left = (width - square_size) // 2
        top = (height - square_size) // 2
        right = left + square_size
        bottom = top + square_size
        
        # Crop to square
        img_cropped = img.crop((left, top, right, bottom))
        print(f"After crop: {img_cropped.size}")
        
        # Resize to target size
        img_resized = img_cropped.resize((size, size), Image.Resampling.LANCZOS)
        print(f"After resize: {img_resized.size}")
        
        # Determine output path
        if output_path is None:
            input_p = Path(input_path)
            output_path = input_p.parent / f"{input_p.stem}_square{input_p.suffix}"
        
        # Save the image
        img_resized.save(output_path, "PNG")
        print(f"✓ Saved to: {output_path}")
        
    except FileNotFoundError:
        print(f"✗ Error: File not found: {input_path}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Crop and resize PNG image to square 1024x1024"
    )
    parser.add_argument("input", help="Input PNG image path")
    parser.add_argument(
        "-o", "--output",
        help="Output image path (default: input_square.png)"
    )
    parser.add_argument(
        "-s", "--size",
        type=int,
        default=1024,
        help="Target square size in pixels (default: 1024)"
    )
    
    args = parser.parse_args()
    
    crop_and_resize_image(
        input_path=args.input,
        output_path=args.output,
        size=args.size
    )


if __name__ == "__main__":
    main()

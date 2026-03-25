import type { ImgHTMLAttributes } from "react";

type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

export default function Image({ src, alt, width, height, ...props }: ImageProps) {
  return <img src={src} alt={alt} width={width} height={height} {...props} />;
}

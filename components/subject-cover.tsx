import { cn } from "cn";
import { subjectCoverUrl } from "@/lib/subjects";

/** 科目封面插画（3:4），旁边总会有科目名，所以图片本身按装饰处理。 */
export function SubjectCover({
  slug,
  size = "lg",
  className,
}: {
  slug: string;
  size?: "lg" | "sm";
  className?: string;
}) {
  const [width, height] = size === "sm" ? [240, 320] : [600, 800];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={subjectCoverUrl(slug, size)}
      alt=""
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={cn("aspect-[3/4] object-cover", className)}
    />
  );
}

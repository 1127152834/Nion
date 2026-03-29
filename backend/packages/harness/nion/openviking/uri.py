def notebook_resource_uri(source_relative_path: str) -> str:
    normalized = source_relative_path.strip().replace("\\", "/")
    stem = normalized.removesuffix(".md")
    return f"viking://resources/notebook/{stem}"

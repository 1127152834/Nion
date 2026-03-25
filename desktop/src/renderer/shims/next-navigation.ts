import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    prefetch: async () => {},
  };
}

export function usePathname() {
  return useLocation().pathname;
}

export function useParamsShim<T extends Record<string, string | undefined>>() {
  return useParams() as T;
}

export function useSearchParamsShim() {
  const [params] = useSearchParams();
  return params;
}

export { useParamsShim as useParams, useSearchParamsShim as useSearchParams };

import { createContext, useContext } from "react";

const DesktopImageContext = createContext(true);

export function DesktopImageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DesktopImageContext.Provider value={true}>
      {children}
    </DesktopImageContext.Provider>
  );
}

export function useDesktopImageContext() {
  return useContext(DesktopImageContext);
}

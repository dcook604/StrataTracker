import { useLocation } from "wouter";

export function useQueryParams() {
  const [location] = useLocation();
  const queryParams = new URLSearchParams(location.split("?")[1] || "");

  return {
    queryParams,
    getParam: (key: string) => queryParams.get(key),
    setParam: (key: string, value: string) => {
      queryParams.set(key, value);
      return `${location.split("?")[0]}?${queryParams.toString()}`;
    },
    deleteParam: (key: string) => {
      queryParams.delete(key);
      const newSearch = queryParams.toString();
      return `${location.split("?")[0]}${newSearch ? `?${newSearch}` : ""}`;
    },
  };
} 
import { useLoading } from "@/contexts/useLoading";
import { useEffect } from "react";

/**
 * Customer service placeholder page.
 */
const CustomerService = () => {
  const { setIsLoading } = useLoading();
  useEffect(() => {
    setIsLoading(false);
  }, [setIsLoading]);

  return <div>Customer Service Page</div>;
};
export default CustomerService;

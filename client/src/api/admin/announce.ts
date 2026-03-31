import { Response } from "@/types";
import API from "../axios";
import { Announce } from "@/types/Announce";

export const getAnnounces = async (filters = {}): Promise<Response> => {
  const params = { ...filters };
  const { data } = await API.get("/admin/announce", { params });
  return data;
};

export const operateAnnounces = async (payload: {
  creates?: Partial<Announce>[];
  updates?: (Partial<Announce> & { id: number })[];
  deletes?: number[];
}): Promise<Response> => {
  const { data } = await API.post("/admin/announce/operate", payload);
  return data;
};

export const getMemberOverview = async (): Promise<Response> => {
  const { data } = await API.get("/admin/announce/member_overview");
  return data;
};

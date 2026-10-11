import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { api, type Mark } from "./api";

const KEYS = {
  accounts: ["accounts"],
  followUps: (accountId: string) => ["follow-ups", accountId],
  history: (accountId: string) => ["history", accountId],
} as const;

export const useAccounts = () => useQuery({ queryKey: KEYS.accounts, queryFn: api.accounts });

export const useFollowUps = (accountId: string) =>
  useQuery({ queryKey: KEYS.followUps(accountId), queryFn: () => api.followUps(accountId) });

export const useHistory = (accountId: string) =>
  useQuery({ queryKey: KEYS.history(accountId), queryFn: () => api.history(accountId) });

export const useMark = (accountId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mark: Mark) => api.mark(accountId, mark),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: KEYS.followUps(accountId) }),
        queryClient.invalidateQueries({ queryKey: KEYS.history(accountId) }),
      ]),
  });
};

export const useImport = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: api.importFile,
    onSuccess: async ({ accountId }) => {
      await queryClient.invalidateQueries();
      navigate(`/accounts/${accountId}`);
    },
  });
};

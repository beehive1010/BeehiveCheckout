// hooks/useApprovalAndClaim.ts
import { getApprovalForTransaction } from "thirdweb/extensions/erc20";
import { sendAndConfirmTransaction } from "thirdweb";
import { useCallback, useState } from "react";
import { toast } from "react-hot-toast";

interface useERC20ApprovalParams {
    account: any;
    transaction: any;
}

export function useERC20Approval({ account, transaction }: useERC20ApprovalParams) {
    const [isApproving, setIsApproving] = useState(false);

    const approve = useCallback(async () => {
        if (!account) return false;
        setIsApproving(true);
        try {
            const approvalTx = await getApprovalForTransaction({
                transaction,
                account,
            });

            if (approvalTx) {
                await sendAndConfirmTransaction({ transaction: approvalTx, account });
                toast.success("Approval successful");
                return true;
            }

            return true; // already approved or not required
        } catch (error) {
            console.error("Approval failed:", error);
            toast.error("Approval failed or denied");
            return false;
        } finally {
            setIsApproving(false);
        }
    }, [account, transaction]);

    return { approve, isApproving };
}
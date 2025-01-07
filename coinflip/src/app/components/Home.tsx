"use client";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  prepareContractCall,
  createThirdwebClient,
  getContract,
  readContract,
  sendAndConfirmTransaction,
  prepareEvent,
  getContractEvents,
} from "thirdweb";
import {
  useActiveWallet,
  useActiveWalletChain,
  useSwitchActiveWalletChain,
  ConnectButton,
  useActiveAccount,
} from "thirdweb/react";

import { createWallet, walletConnect } from "thirdweb/wallets";
import { defineChain } from "thirdweb/chains";
import coinflipAbi from "../abis/Coinflip.json";
import FlipHistory from "../type";

export default function Home() {
  const wallet = useActiveWallet();
  const chainId = useActiveWalletChain();
  const account = useActiveAccount();
  const switchChain = useSwitchActiveWalletChain();
  const [connected, setConnected] = useState(false);

  const [flipHistory, setFlipHistory] = useState<FlipHistory[]>([]);
  const client = createThirdwebClient({
    clientId: "0492ff846152da63b0abeef1cb262fcd",
  });
  const wallets = [
    createWallet("io.metamask"),
    createWallet("com.coinbase.wallet"),
    walletConnect(),
    createWallet("com.trustwallet.app"),
    createWallet("app.phantom"),
  ];

  const chain = defineChain({
    id: 84532,
  });
  const getFlipHistory = async () => {
    const coinflip = getContract({
      client,
      chain,
      address: coinflipAbi.address as `0x${string}`,
      abi: coinflipAbi.abi as any,
    });
    const getFlipHistory = await readContract({
      contract: coinflip,
      method: "getFlipHistory",
      params: [],
    });
    setFlipHistory(getFlipHistory);
  };

  const flipCoin = async () => {
    const coinflip = getContract({
      client,
      chain,
      address: coinflipAbi.address as `0x${string}`,
      abi: coinflipAbi.abi as any,
    });
    const admin = await readContract({
        contract: coinflip,
        method: "admin",
        params: [],
      });
      console.log(admin);
    const amount = ethers.parseUnits('0.00001', 18);
    const flipTx = prepareContractCall({
      contract: coinflip,
      method: "flipCoin",
      params: [],
      value: amount,
    });
    console.log(flipTx);
    if (!account) {
        return;
    }
    const tx = await sendAndConfirmTransaction({
        account: account,
        transaction: flipTx,
    });
    console.log(tx);
  }
  useEffect(() => {
    if (wallet && chainId?.id !== 84532) {
      const chain = defineChain({
        id: 84532,
      });
      switchChain(chain);
      
    }
    if(wallet){
        setConnected(true);
    }
  }, [wallet, chainId?.id]);

  useEffect(() => {
    getFlipHistory();
    const interval = setInterval(() => {
      getFlipHistory();
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  return (
    <main className="flex h-screen w-screen bg-[#1e293b]  flex-col items-center gap-4">
      <div className="flex flex-col space-y-8 justify-center">
        <span className="text-white text-xl">
          #1 MOST TRUSTED PLACE TO FLIP
        </span>
        <div className="flex justify-center">
          {connected ? (
            <button className="p-4 bg-[#1e293b] border border-white rounded-md text-white font-bold hover:bg-white hover:text-[#1e293b] transition-all duration-300" onClick={flipCoin} >FLIP A COIN</button>
          ) : (
            <ConnectButton
              client={client}
              wallets={wallets}
              theme={"dark"}
              connectModal={{
                size: "compact",
                titleIcon: "",
                showThirdwebBranding: false,
              }}
            />
          )}
        </div>
      </div>
      <div className="flex flex-col space-y-8 justify-center items-center">
        <p className="text-white text-xl">RECENT PLAYS</p>
        <div className="flex flex-col justify-center border border-white sm:min-w-[600px] rounded-md items-start">
          {flipHistory?.map((flip: FlipHistory, index: number) => (
            <div key={index} className="flex justify-between border-t border-b border-white text-white w-full h-[40px] items-center px-1">
              { flip.player} {flip.won ? "won" : "lost"} {ethers.formatEther(flip.amount)}ETH
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

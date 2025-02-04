import React, { useEffect, useMemo, useState } from "react";

const quotes = [
  {
    japanese: "俺が求めるのは頂点だけだ、それ以外は興味ねぇ",
    english:
      "The only thing I seek is the top; I’m not interested in anything else.",
  },
  {
    japanese: "世界は俺のためにある",
    english: "The world exists for me.",
  },
  {
    japanese: "勝つか死ぬか、それだけだ",
    english: "Win or die. That’s all there is.",
  },
  {
    japanese: "俺の前に立つな、影すら踏ませない",
    english: "Don’t stand in my way; I won’t even let you step on my shadow.",
  },
  {
    japanese: "俺が決めた道が正しい",
    english: "The path I choose is the right one.",
  },
  {
    japanese: "天を掴むのはこの俺だ",
    english: "I am the one who will seize the heavens.",
  },
  {
    japanese: "生きるか死ぬかなんてくだらねぇ、俺は勝つだけだ",
    english: "Living or dying doesn’t matter. I only care about winning.",
  },
  {
    japanese: "下を向いてる暇はねぇ、俺は永遠に前だけを見る",
    english: "I don’t have time to look down. I’ll always look forward.",
  },
  {
    japanese: "俺に不可能は存在しない",
    english: "The word 'impossible' doesn’t exist for me.",
  },
  {
    japanese: "強さを語るなら、俺を超えてからにしろ",
    english: "If you want to talk about strength, surpass me first.",
  },
  {
    japanese: "運命すら俺の手で変えてみせる",
    english: "I’ll change even destiny with my own hands.",
  },
  {
    japanese: "恐れることはない、俺が恐れを支配する",
    english: "There’s nothing to fear; I dominate fear itself.",
  },
  {
    japanese: "力こそが全てを決める",
    english: "Power is what decides everything.",
  },
  {
    japanese: "俺は全てを背負い、全てを壊す",
    english: "I will carry everything and destroy everything.",
  },
  {
    japanese: "敗北は俺の辞書には存在しない",
    english: "Defeat doesn’t exist in my dictionary.",
  },
  {
    japanese: "俺を止められるのは俺だけだ",
    english: "The only one who can stop me is me.",
  },
  {
    japanese: "他人の評価など糞くらえ",
    english: "To hell with other people's opinions.",
  },
  {
    japanese: "全てを燃やし尽くしてでも前に進む",
    english: "I’ll move forward, even if it means burning everything to ashes.",
  },
  {
    japanese: "頂点を目指す者は孤独でいい",
    english: "Those who aim for the top can embrace solitude.",
  },
  {
    japanese: "勝利は俺の宿命だ",
    english: "Victory is my destiny.",
  },
  {
    japanese: "弱い者は俺の前にひれ伏すだけだ",
    english: "The weak have no choice but to bow before me.",
  },
  {
    japanese: "努力は裏切らない、俺がその証だ",
    english: "Effort never betrays, and I am living proof of that.",
  },
  {
    japanese: "俺に不可能を押し付けるな、それを覆すのが俺の流儀だ",
    english: "Don’t impose impossibility on me; defying it is my way.",
  },
];

function LoadingPage() {
  const [progress, setProgress] = useState(0);

  const quote = useMemo(
    () => quotes[Math.floor(Math.random() * quotes.length)],
    []
  );

  useEffect(() => {
    let interval = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress >= 100) {
          clearInterval(interval);
          return 100;
        }
        return oldProgress + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center relative">
      {/* Progress Bar at the top */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gray-200">
        <div
          className="h-full bg-blue-500 transition-all duration-100"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Quote Section */}
      <h2 className="text-[3vw] max-w-screen text-center">{quote.japanese}</h2>
      <h3 className="text-[1.25vw] tracking-wider mt-10 text-center">
        {quote.english}
      </h3>
    </div>
  );
}

export default LoadingPage;

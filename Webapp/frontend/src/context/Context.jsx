import React, { createContext, useEffect, useState } from "react";
import axios from "../utils/axios";
import { useUser } from "@clerk/clerk-react";

export const UserContext = createContext();

// Comprehensive mapping of language keys to display names.
const languageMapping = {
  javascript: "JavaScript",
  javascriptreact: "JSX",
  typescript: "TypeScript",
  typescriptreact: "TSX",
  html: "HTML",
  css: "CSS",
  json: "JSON",
  python: "Python",
  java: "Java",
  csharp: "C#",
  cpp: "C++",
  "c++": "C++",
  php: "PHP",
  ruby: "Ruby",
  rust: "Rust",
  go: "Go",
  swift: "Swift",
  kotlin: "Kotlin",
  sass: "Sass/SCSS",
  scss: "Sass/SCSS",
  sql: "SQL",
  bash: "Bash",
  shell: "Bash",
  markdown: "Markdown",
  docker: "Docker",
  kubernetes: "Kubernetes",
  graphql: "GraphQL",
  node: "Node.js",
  nodejs: "Node.js",
  express: "Express",
  nextjs: "Next.js",
  nestjs: "NestJS",
  vue: "Vue.js",
  vuejs: "Vue.js",
  angular: "Angular",
  reactnative: "React Native",
  "plain text": "Plain Text",
  plaintext: "Plain Text",
  txt: "Plain Text",
  xml: "XML",
  yaml: "YAML",
  yml: "YAML",
  coffeescript: "CoffeeScript",
  coffee: "CoffeeScript",
  dart: "Dart",
  elixir: "Elixir",
  erlang: "Erlang",
  haskell: "Haskell",
  lua: "Lua",
  objectivec: "Objective-C",
  "objective-c": "Objective-C",
  perl: "Perl",
  r: "R",
  scala: "Scala",
  vim: "Vim",
  viml: "Vim script",
  shellscript: "Shell Script",
};

export const allowedLanguages = Object.keys(languageMapping);

function Context({ children }) {
  const { user } = useUser();
  const [fetchedUser, setFetchedUser] = useState(null);
  const [promptState, setPromptState] = useState("error");
  const [promptMessage, setPromptMessage] = useState("");

  const fetchUserData = async (otherUserId) => {
    if (!otherUserId) return;

    try {
      const response = await axios.post("/api/fetchUser", {
        userId: otherUserId,
      });
      setFetchedUser(response.data.user);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserData(user.id);
    }
  }, [user]);

  return (
    <UserContext.Provider
      value={{
        user,
        fetchedUser,
        promptState,
        promptMessage,
        setPromptState,
        setPromptMessage,
        fetchUserData,
        formatLanguage: (lang) => {
          const lowerLang = lang.trim().toLowerCase();
          return (
            languageMapping[lowerLang] ||
            lowerLang.charAt(0).toUpperCase() + lowerLang.slice(1)
          );
        },
        allowedLanguages,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export default Context;

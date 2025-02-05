import React, { createContext, useEffect, useState } from "react";
import axios from "../utils/axios";
import { useUser } from "@clerk/clerk-react";

export const UserContext = createContext();

function Context({ children }) {
  const { user } = useUser();
  const [fetchedUser, setFetchedUser] = useState(null);
  const [promptState, setPromptState] = useState("error");
  const [promptMessage, setPromptMessage] = useState("");

  const formatLanguage = (lang) => {
    const lowerLang = lang.toLowerCase();

    switch (lowerLang) {
      case "javascriptreact":
        return "JSX";
      case "typescriptreact":
        return "TSX";
      case "typescript":
        return "TS";
      case "javascript":
        return "JS";
      case "html":
        return "HTML";
      case "css":
        return "CSS";
      case "json":
        return "JSON";
      case "python":
        return "Python";
      case "java":
        return "Java";
      case "csharp":
        return "C#";
      case "php":
        return "PHP";
      case "ruby":
        return "Ruby";
      case "rust":
        return "Rust";
      case "go":
        return "Go";
      case "swift":
        return "Swift";
      case "kotlin":
        return "Kotlin";
      case "sass":
      case "scss":
        return "Sass/SCSS";
      case "sql":
        return "SQL";
      case "bash":
        return "Bash";
      case "markdown":
        return "Markdown";
      case "docker":
        return "Docker";
      case "kubernetes":
        return "Kubernetes";
      case "graphql":
        return "GraphQL";
      case "node":
      case "nodejs":
        return "Node.js";
      case "express":
        return "Express";
      case "nextjs":
        return "Next.js";
      case "nestjs":
        return "NestJS";
      case "vue":
      case "vuejs":
        return "Vue.js";
      case "angular":
        return "Angular";
      case "reactnative":
        return "React Native";
      default:
        // Capitalize the first letter for any other languages.
        return lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase();
    }
  };

  const fetchUserData = async (otherUserId) => {
    if (!otherUserId) return; // Prevents unnecessary execution

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
      fetchUserData();
    } else {
      console.log("user not present");
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
        formatLanguage,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export default Context;

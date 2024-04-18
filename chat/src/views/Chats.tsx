import { useCallback, useState } from "react";
import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";

import { useChats } from "../hooks";
import { generateChatFromQuestion, putNewChatInStorage } from "../lib/chat";

import Chat from "./chat/Chat";

const Chats: React.FC = () => {
  const { chats, isLoading, deleteChat, fetchChatsFromLocalStorage } = useChats();
  const [chatText, setChatText] = useState("");
  const navigation = useNavigation();

  const createNewChatActionHandler = useCallback(() => {
    const newChat = generateChatFromQuestion(chatText);
    putNewChatInStorage(newChat).then(() => {
      fetchChatsFromLocalStorage();
      navigation.push(<Chat chat={newChat} />);
    });

    setChatText("");
  }, [chatText]);

  const hasNoChatHistory = chats.length === 0;

  return (
    <List
      searchText={chatText}
      isLoading={isLoading}
      filtering={!hasNoChatHistory}
      searchBarPlaceholder={hasNoChatHistory ? "Send a message..." : "Search through your chats"}
      onSearchTextChange={setChatText}
      actions={
        <ActionPanel>
          {hasNoChatHistory && (
            <ActionPanel.Section title="Input">
              <Action
                title="Send a Message"
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                icon={Icon.Text}
                onAction={() => {
                  createNewChatActionHandler();
                }}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    >
      <List.EmptyView title="No chats found. Type in something to Chat" />
      <List.Section subtitle={chats.length.toString()}>
        {chats.map((chat) => (
          <List.Item
            key={chat.id}
            title={chat.title}
            accessories={[
              {
                tag: chat.model,
              },
              {
                text: `${new Date(chat.updated_on).toLocaleDateString()} ${new Date(chat.updated_on).getUTCHours()}:${new Date(chat.updated_on).getMinutes()}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="Select" target={<Chat chat={chat} />} />
                <Action title="Delete" onAction={() => deleteChat(chat.id)}></Action>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
};

export default Chats;

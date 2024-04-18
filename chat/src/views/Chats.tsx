import { useCallback, useState } from "react";
import { Action, ActionPanel, Icon, List, getPreferenceValues, useNavigation } from "@raycast/api";

import { useChats } from "../hooks";
import { CHAT_MODEL_TO_NAME_MAP, generateChatFromQuestion, addOrUpdateChatInStorage } from "../lib/chat";

import Chat from "./chat/Chat";

const Chats: React.FC = () => {
  const { chats, isLoading, deleteChat, fetchChatsFromLocalStorage } = useChats();
  const [chatText, setChatText] = useState("");
  const navigation = useNavigation();

  const createNewChatActionHandler = useCallback(() => {
    const preferences = getPreferenceValues<Preferences>();
    const newChat = generateChatFromQuestion(chatText, preferences.chatModel);
    addOrUpdateChatInStorage(newChat).then(() => {
      fetchChatsFromLocalStorage();
      navigation.push(<Chat chat={newChat} onChatUpdated={() => fetchChatsFromLocalStorage()} />);
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
              { tag: chat.exchanges.map((exchange) => CHAT_MODEL_TO_NAME_MAP[exchange.model]).join(", ") },
              {
                text: `${new Date(chat.updated_on).toLocaleDateString()} ${new Date(chat.updated_on).getUTCHours()}:${new Date(chat.updated_on).getMinutes()}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Select"
                  target={<Chat chat={chat} onChatUpdated={() => fetchChatsFromLocalStorage()} />}
                />
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

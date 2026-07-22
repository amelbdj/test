export interface User {
  id: string;
  email: string;
  username: string;
  bio: string;
  profile_picture: string | null;
  streak: number;
  max_streak?: number;
  streak_freezes?: number;
  last_drop_date: string | null;
  friends_count: number;
  created_at: string;
}

export interface Drop {
  id: string;
  user_id: string;
  username: string;
  user_profile_picture: string | null;
  media_data: string;
  media_url?: string | null;
  media_type: 'image' | 'video';
  description: string;
  is_revealed: boolean;
  reveal_date: string;
  likes_count: number;
  comments_count: number;
  liked_by_user: boolean;
  created_at: string;
}

export interface Comment {
  id: string;
  drop_id: string;
  user_id: string;
  username: string;
  user_profile_picture: string | null;
  content: string;
  created_at: string;
}

export interface FriendRequest {
  id: string;
  from_user_id: string;
  from_username: string;
  from_profile_picture: string | null;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface Friend {
  id: string;
  username: string;
  profile_picture: string | null;
  streak: number;
}

export interface SearchUser {
  id: string;
  username: string;
  profile_picture: string | null;
  is_friend: boolean;
  request_pending: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  participant_usernames: string[];
  participant_pictures: (string | null)[];
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_username: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'friend_request' | 'like' | 'comment' | 'message' | 'reveal' | 'friend_accepted';
  title: string;
  message: string;
  related_id: string | null;
  read: boolean;
  created_at: string;
}

export interface RevealStatus {
  next_reveal: string;
  seconds_until_reveal: number;
  is_reveal_time: boolean;
}

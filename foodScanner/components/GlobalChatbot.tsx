import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, ActivityIndicator, KeyboardAvoidingView, 
  Platform, Dimensions, Image, Modal
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, SlideInRight, ZoomIn, FadeInDown, SlideInUp } from 'react-native-reanimated';
import { Colors, Shadows, BorderRadius, Spacing, Typography } from '../constants/theme';
import { BlurView } from 'expo-blur';

import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');
const API_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:8000';

export const GlobalChatbot = () => {
  const [visible, setVisible] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    { 
      role: 'ai', 
      text: "Hi! I'm NutriScan AI. How can I help you today? I can guide you through the app, answer nutrition questions, or help with recipes!" 
    }
  ]);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, loading, visible]);

  const handleSend = async (customText?: string) => {
    const userText = customText || input;
    if (!userText.trim() || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      // Intelligent Offline / App Guidance Fallback
      const q = userText.toLowerCase();
      if (q.includes("how to scan") || q.includes("scan food")) {
        setMessages(prev => [...prev, { 
          role: 'ai', 
          text: "To scan food, just tap the Camera icon in the middle of the bottom navigation bar. Point your camera at your meal and tap 'Analyze'. I'll then show you the nutrition facts and a recipe!" 
        }]);
        setLoading(false);
        return;
      }
      
      if (q.includes("protein goal") || q.includes("target")) {
        setMessages(prev => [...prev, { 
          role: 'ai', 
          text: "You can set your health goals and targets in the Profile section. Go to the 'Profile' tab, tap 'Edit Profile', and update your weight, height, and goal (lose/gain/maintain). I'll automatically calculate your daily targets!" 
        }]);
        setLoading(false);
        return;
      }

      // Use the general conversation endpoint
      const response = await fetch(`${API_URL}/chef/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: userText,
          history: messages.map(m => ({ role: m.role, content: m.text })),
          recipe: { title: "App Guidance", ingredients: [], steps: [] }, // Dummy recipe for context
        })
      });

      if (!response.ok) throw new Error("Failed to chat");

      const data = await response.json();
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: data.response 
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: "I'm having a little trouble connecting. Please try again in a moment!" 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const QUICK_ACTIONS = [
    { label: "How to scan food?", icon: "camera-outline" },
    { label: "Healthy dinner ideas", icon: "restaurant-outline" },
    { label: "My protein goal?", icon: "fitness-outline" },
    { label: "App features", icon: "help-circle-outline" }
  ];

  return (
    <>
      {/* Floating Button */}
      <TouchableOpacity 
        style={styles.floatingBtn} 
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={Colors.light.premiumGradient as any}
          style={styles.floatingGradient}
        >
          <MaterialCommunityIcons name="robot-happy" size={28} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVisible(false)}
      >
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.chatWindow}>
              {/* Header */}
              <View style={styles.header}>
                <LinearGradient
                  colors={Colors.light.primaryGradient as any}
                  style={styles.headerGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.headerInfo}>
                    <View style={styles.aiAvatar}>
                      <MaterialCommunityIcons name="robot" size={24} color={Colors.light.primary} />
                    </View>
                    <View>
                      <Text style={styles.headerTitle}>NutriScan AI</Text>
                      <View style={styles.statusRow}>
                        <View style={styles.statusDot} />
                        <Text style={styles.headerSub}>Always Online</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#FFF" />
                  </TouchableOpacity>
                </LinearGradient>
              </View>

              {/* Chat Area */}
              <ScrollView 
                ref={scrollViewRef}
                style={styles.chatArea}
                contentContainerStyle={styles.chatContent}
                showsVerticalScrollIndicator={false}
              >
                {messages.map((msg, i) => (
                  <Animated.View 
                    key={i} 
                    entering={msg.role === 'ai' ? FadeInUp : SlideInRight}
                    style={[
                      styles.messageBubble,
                      msg.role === 'ai' ? styles.aiBubble : styles.userBubble
                    ]}
                  >
                    <Text style={[
                      styles.messageText,
                      msg.role === 'ai' ? styles.aiText : styles.userText
                    ]}>
                      {msg.text}
                    </Text>
                  </Animated.View>
                ))}
                {loading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={Colors.light.primary} />
                    <Text style={styles.loadingText}>AI is thinking...</Text>
                  </View>
                )}
              </ScrollView>

              {/* Footer */}
              <View style={styles.footer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={styles.suggestions}
                  contentContainerStyle={styles.suggestionsContent}
                >
                  {QUICK_ACTIONS.map((s, i) => (
                    <TouchableOpacity 
                      key={i} 
                      style={styles.suggestionBadge}
                      onPress={() => handleSend(s.label)}
                    >
                      <Ionicons name={s.icon as any} size={14} color={Colors.light.primary} />
                      <Text style={styles.suggestionText}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {loading && (
                  <Animated.View entering={FadeInUp} style={styles.typingIndicator}>
                    <View style={styles.typingDot} />
                    <View style={[styles.typingDot, { opacity: 0.6 }]} />
                    <View style={[styles.typingDot, { opacity: 0.3 }]} />
                    <Text style={styles.typingText}>NutriScan AI is typing...</Text>
                  </Animated.View>
                )}

                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Ask me anything..."
                    value={input}
                    onChangeText={setInput}
                    multiline
                    placeholderTextColor="#94A3B8"
                  />
                  <TouchableOpacity 
                    style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]} 
                    onPress={() => handleSend()}
                    disabled={!input.trim() || loading}
                  >
                    <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.sendGradient}>
                      <Ionicons name="send" size={20} color="#FFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </BlurView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingBtn: {
    position: 'absolute',
    right: 20,
    bottom: 100, // Above tab bar
    width: 64,
    height: 64,
    borderRadius: 32,
    ...Shadows.premium,
    zIndex: 999,
  },
  floatingGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  chatWindow: {
    height: height * 0.85,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  header: {
    height: 100,
  },
  headerGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  closeBtn: {
    padding: 8,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 20,
    gap: 16,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 16,
    borderRadius: 24,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.light.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  aiText: {
    color: '#1E293B',
  },
  userText: {
    color: '#FFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  suggestions: {
    marginBottom: 15,
  },
  suggestionsContent: {
    gap: 10,
    paddingRight: 20,
  },
  suggestionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  suggestionText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
    paddingLeft: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.primary,
  },
  typingText: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

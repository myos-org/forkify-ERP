// app/(auth)/login.js — v3 premium login
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loginThunk, registerThunk, clearError } from '../../src/store';
import { Colors, Typography, Radius, Spacing, Shadow } from '../../src/theme';

function InputField({ label, value, onChange, placeholder, secure, keyboardType, icon, editable = true, autoCapitalize = 'none' }) {
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);

  return (
    <View style={LS.field}>
      <Text style={LS.label}>{label}</Text>
      <View style={[LS.inputWrap, focused && LS.inputFocused, !editable && LS.inputDisabled]}>
        <Ionicons name={icon} size={18} color={focused ? Colors.primary : Colors.textMuted} style={LS.inputIcon} />
        <TextInput
          style={LS.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={secure && !shown}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secure && (
          <TouchableOpacity onPress={() => setShown(s => !s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={shown ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [localError, setLocalError] = useState(null);
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', fullName: '' });

  const dispatch = useDispatch();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { loading, error, isAuthenticated, message } = useSelector((s) => s.auth);

  useEffect(() => {
    if (isAuthenticated) router.replace('/(app)/(tabs)/dashboard');
  }, [isAuthenticated]);

  useEffect(() => () => { dispatch(clearError()); }, []);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setLocalError(null);
    if (error) dispatch(clearError());
  };

  const validate = () => {
    if (isLogin) {
      if (!form.username.trim() || !form.password) return 'Please fill in all fields';
      if (form.password.length < 6) return 'Password must be at least 6 characters';
    } else {
      if (!form.fullName.trim() || !form.username.trim() || !form.email.trim() || !form.password || !form.confirmPassword)
        return 'Please fill in all fields';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email address';
      if (form.password.length < 6) return 'Password must be at least 6 characters';
      if (form.password !== form.confirmPassword) return 'Passwords do not match';
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setLocalError(err); return; }
    if (isLogin) {
      dispatch(loginThunk({ username: form.username.trim(), password: form.password }));
    } else {
      const result = await dispatch(registerThunk({
        username: form.username.trim(), email: form.email.trim(),
        password: form.password, fullName: form.fullName.trim(),
      }));
      if (!result.error) dispatch(loginThunk({ username: form.username.trim(), password: form.password }));
    }
  };

  const toggle = () => {
    setIsLogin(!isLogin);
    setLocalError(null);
    dispatch(clearError());
    setForm({ username: '', email: '', password: '', confirmPassword: '', fullName: '' });
  };

  const displayError = localError || error;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#f5f7fb' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[LS.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <View style={LS.brand}>
          <View style={LS.logoOuter}>
            <View style={LS.logoInner}>
              <Text style={LS.logoGlyph}>K</Text>
            </View>
          </View>
          <Text style={LS.brandName}>Klyro</Text>
          <Text style={LS.brandSub}>Enterprise Management Platform</Text>
        </View>

        {/* Card */}
        <View style={[LS.card, Shadow.md]}>
          {/* Tab switcher */}
          <View style={LS.tabRow}>
            <TouchableOpacity
              style={[LS.tabBtn, isLogin && LS.tabBtnActive]}
              onPress={() => !isLogin && toggle()}
            >
              <Text style={[LS.tabBtnText, isLogin && LS.tabBtnTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[LS.tabBtn, !isLogin && LS.tabBtnActive]}
              onPress={() => isLogin && toggle()}
            >
              <Text style={[LS.tabBtnText, !isLogin && LS.tabBtnTextActive]}>Create Account</Text>
            </TouchableOpacity>
          </View>

          <View style={LS.cardBody}>
            {!!displayError && (
              <View style={LS.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                <Text style={LS.errorText}>{displayError}</Text>
              </View>
            )}
            {!!message && !displayError && (
              <View style={LS.successBanner}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#15803d" />
                <Text style={LS.successText}>{message}</Text>
              </View>
            )}

            {!isLogin && (
              <InputField label="Full Name" value={form.fullName} onChange={v => set('fullName', v)}
                placeholder="Your full name" icon="person-outline" editable={!loading} autoCapitalize="words" />
            )}

            <InputField label="Username" value={form.username} onChange={v => set('username', v)}
              placeholder="Enter username" icon="at-outline" editable={!loading} />

            {!isLogin && (
              <InputField label="Email Address" value={form.email} onChange={v => set('email', v)}
                placeholder="your@email.com" icon="mail-outline" keyboardType="email-address" editable={!loading} />
            )}

            <InputField label="Password" value={form.password} onChange={v => set('password', v)}
              placeholder={isLogin ? 'Enter password' : 'Min. 6 characters'} icon="lock-closed-outline"
              secure editable={!loading} />

            {!isLogin && (
              <InputField label="Confirm Password" value={form.confirmPassword} onChange={v => set('confirmPassword', v)}
                placeholder="Confirm password" icon="lock-closed-outline" secure editable={!loading} />
            )}

            <TouchableOpacity
              style={[LS.submitBtn, (loading || !form.username || !form.password) && LS.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={LS.submitText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={LS.version}>Klyro ERP v2.1.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const LS = StyleSheet.create({
  scroll:          { alignItems: 'center', paddingHorizontal: 20 },
  brand:           { alignItems: 'center', marginBottom: 28 },
  logoOuter:       { width: 88, height: 88, borderRadius: 28, backgroundColor: '#EAF1FF', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#D0D5DD' },
  logoInner:       { width: 68, height: 68, borderRadius: 20, backgroundColor: '#101828', alignItems: 'center', justifyContent: 'center' },
  logoGlyph:       { fontSize: 34, fontWeight: '900', color: '#60A5FA', letterSpacing: -1 },
  brandName:       { fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  brandSub:        { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 4, fontWeight: '500' },

  card:            { width: '100%', maxWidth: 420, backgroundColor: Colors.card, borderRadius: Radius.xxl, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },

  tabRow:          { flexDirection: 'row', backgroundColor: Colors.bg, padding: 4 },
  tabBtn:          { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: Radius.lg - 2 },
  tabBtnActive:    { backgroundColor: Colors.card, ...Platform.select({ ios: { shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 }, android: { elevation: 2 } }) },
  tabBtnText:      { fontSize: Typography.sm, fontWeight: '600', color: Colors.textMuted },
  tabBtnTextActive:{ color: Colors.text, fontWeight: '700' },

  cardBody:        { padding: 24 },

  errorBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  errorText:       { flex: 1, color: '#dc2626', fontSize: Typography.sm },
  successBanner:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  successText:     { flex: 1, color: '#15803d', fontSize: Typography.sm },

  field:           { marginBottom: 16 },
  label:           { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 7 },
  inputWrap:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.bg, paddingHorizontal: 12 },
  inputFocused:    { borderColor: Colors.primary, backgroundColor: '#fafcff' },
  inputDisabled:   { opacity: 0.6 },
  inputIcon:       { marginRight: 8 },
  input:           { flex: 1, paddingVertical: 12, fontSize: Typography.base, color: Colors.text },

  submitBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 15, marginTop: 8 },
  submitBtnDisabled:{ opacity: 0.6 },
  submitText:      { color: '#fff', fontSize: Typography.md, fontWeight: '700', letterSpacing: 0.1 },

  version:         { marginTop: 24, fontSize: Typography.xs, color: Colors.textMuted, fontWeight: '500' },
});

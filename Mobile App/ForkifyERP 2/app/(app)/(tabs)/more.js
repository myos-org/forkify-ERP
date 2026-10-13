// app/(app)/(tabs)/more.js — v3
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePermission, useBranch } from '../../../src/hooks';
import { logoutThunk, setActiveBranch } from '../../../src/store';
import { branchService } from '../../../src/services';
import { Colors, Typography, Radius, Shadow, Spacing } from '../../../src/theme';

const SECTIONS = [
  {
    label: 'Operations',
    items: [
      { label: 'Daily Sales',     icon: 'cart-outline',          path: '/(app)/sales/daily-sales'   },
      { label: 'Menu Management', icon: 'restaurant-outline',    path: '/(app)/menu/active'           },
      { label: 'Seasonal Menus',  icon: 'leaf-outline',          path: '/(app)/menu/seasonal',  hqOnly: true },
      { label: 'Branch Pricing',  icon: 'pricetag-outline',      path: '/(app)/menu/pricing'          },
      { label: 'Meal Planning',   icon: 'calendar-outline',      path: '/(app)/meal-planning/weekly'  },
      { label: 'Ingredient Forecast', icon: 'analytics-outline', path: '/(app)/meal-planning/forecast'},
      { label: 'Push to Branches',icon: 'share-outline',         path: '/(app)/meal-planning/push', hqOnly: true },
      { label: 'Customer CRM',    icon: 'heart-outline',         path: '/(app)/customers'            },
      { label: 'Shift Scheduler', icon: 'time-outline',          path: '/(app)/staff/shifts', managerOnly: true },
    ],
  },
  {
    label: 'Reports',
    items: [
      { label: 'Inventory Report', icon: 'cube-outline',         path: '/(app)/reports/inventory'  },
      { label: 'Cost & Margin',    icon: 'trending-up-outline',  path: '/(app)/reports/cost'        },
      { label: 'Wastage Report',   icon: 'trash-outline',        path: '/(app)/reports/wastage'     },
      { label: 'Sales Report',     icon: 'bar-chart-outline',    path: '/(app)/reports/sales'       },
      { label: 'Supplier Report',  icon: 'car-outline',          path: '/(app)/reports/supplier'    },
      { label: 'Branch Comparison',icon: 'business-outline',     path: '/(app)/reports/branches', hqOnly: true },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Analytics',        icon: 'analytics-outline',    path: '/(app)/admin/analytics',  hqOnly: true },
      { label: 'User Management',  icon: 'people-outline',       path: '/(app)/admin/users',      hqOnly: true },
      { label: 'Branch Management',icon: 'storefront-outline',   path: '/(app)/admin/branches',   hqOnly: true },
      { label: 'Audit Logs',       icon: 'shield-outline',       path: '/(app)/admin/audit',      hqOnly: true },
    ],
  },
];

const SECTION_COLORS = {
  Operations: { bg: '#eff6ff', color: Colors.primary },
  Reports:    { bg: '#f0fdf4', color: '#059669' },
  Admin:      { bg: '#fdf4ff', color: '#9333ea' },
};

export default function MoreTab() {
  const router   = useRouter();
  const dispatch = useDispatch();
  const insets   = useSafeAreaInsets();
  const { isHQ, canApprove, user } = usePermission();
  const { branchId, branchName }   = useBranch();

  const [branches,    setBranches]    = useState([]);
  const [branchModal, setBranchModal] = useState(false);

  useEffect(() => {
    branchService.getAll().then(r => setBranches(r.data || [])).catch(() => {});
  }, []);

  const roleLabel = {
    ROLE_ADMIN:   'Super Admin',
    ROLE_MANAGER: 'Branch Manager',
    ROLE_STAFF:   'Kitchen Staff',
    ROLE_USER:    'Inventory Clerk',
  }[user?.role] || 'Staff';

  const initials = (user?.fullName || user?.username || 'U').charAt(0).toUpperCase();

  const canSee = (item) => {
    if (item.hqOnly && !isHQ) return false;
    if (item.managerOnly && !canApprove) return false;
    return true;
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView
        contentContainerStyle={[S.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={[S.profileCard, Shadow.card]}>
          <View style={S.avatarWrap}>
            <Text style={S.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.profileName}>{user?.fullName || user?.username || 'User'}</Text>
            <View style={S.rolePill}>
              <Text style={S.roleText}>{roleLabel}</Text>
            </View>
            <TouchableOpacity
              style={S.branchBtn}
              onPress={() => isHQ && setBranchModal(true)}
              activeOpacity={isHQ ? 0.7 : 1}
            >
              <Ionicons name="business-outline" size={12} color={Colors.primary} />
              <Text style={S.branchText}>{branchName}</Text>
              {isHQ && <Ionicons name="chevron-down" size={12} color={Colors.primary} />}
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={S.settingsBtn}
            onPress={() => dispatch(logoutThunk())}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          </TouchableOpacity>
        </View>

        {/* Sections */}
        {SECTIONS.map(section => {
          const visible = section.items.filter(canSee);
          if (!visible.length) return null;
          const sc = SECTION_COLORS[section.label] || SECTION_COLORS.Operations;
          return (
            <View key={section.label} style={S.section}>
              <View style={S.sectionLabelRow}>
                <View style={[S.sectionDot, { backgroundColor: sc.color }]} />
                <Text style={S.sectionLabel}>{section.label}</Text>
              </View>
              <View style={[S.menuCard, Shadow.card]}>
                {visible.map((item, i) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[S.menuItem, i < visible.length - 1 && S.menuItemBorder]}
                    onPress={() => router.push(item.path)}
                    activeOpacity={0.7}
                  >
                    <View style={[S.menuIconWrap, { backgroundColor: sc.bg }]}>
                      <Ionicons name={item.icon} size={18} color={sc.color} />
                    </View>
                    <Text style={S.menuItemLabel}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}

        <Text style={S.version}>Klyro ERP v2.1.0  ·  Enterprise Management System</Text>
      </ScrollView>

      {/* Branch Switcher */}
      <Modal visible={branchModal} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setBranchModal(false)} />
          <View style={S.sheet}>
            <View style={S.sheetHandle} />
            <Text style={S.sheetTitle}>Switch Branch</Text>
            {branches.length === 0 ? (
              <Text style={{ textAlign: 'center', color: Colors.textMuted, padding: 24 }}>No branches found</Text>
            ) : branches.map(b => {
              const active = String(b.id) === String(branchId);
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[S.branchItem, active && S.branchItemActive]}
                  onPress={() => { dispatch(setActiveBranch({ branchId: b.id, branchName: b.name })); setBranchModal(false); }}
                >
                  <View style={[S.branchItemIcon, { backgroundColor: active ? Colors.primaryLight : Colors.bg }]}>
                    <Ionicons name={b.type === 'HQ' ? 'business' : 'storefront-outline'} size={18} color={active ? Colors.primary : Colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.branchItemName, active && { color: Colors.primary }]}>{b.name}</Text>
                    {b.city && <Text style={S.branchItemCity}>{b.city}</Text>}
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
                </TouchableOpacity>
              );
            })}
            <View style={{ height: insets.bottom + 8 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  content:        { paddingHorizontal: Spacing.lg },

  profileCard:    { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.border },
  avatarWrap:     { width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:     { color: '#fff', fontSize: Typography.xxl, fontWeight: '700' },
  profileName:    { fontSize: Typography.lg, fontWeight: '700', color: Colors.text, marginBottom: 5 },
  rolePill:       { backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full, alignSelf: 'flex-start', marginBottom: 5 },
  roleText:       { fontSize: Typography.xs, fontWeight: '700', color: Colors.primary },
  branchBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  branchText:     { fontSize: Typography.xs, color: Colors.primary, fontWeight: '600' },
  settingsBtn:    { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fecaca' },

  section:        { marginBottom: Spacing.lg },
  sectionLabelRow:{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: Spacing.sm },
  sectionDot:     { width: 6, height: 6, borderRadius: 3 },
  sectionLabel:   { fontSize: Typography.xs, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },

  menuCard:       { backgroundColor: Colors.card, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  menuItem:       { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: 12 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  menuIconWrap:   { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  menuItemLabel:  { flex: 1, fontSize: Typography.md, fontWeight: '500', color: Colors.text },

  version:        { textAlign: 'center', fontSize: Typography.xs, color: Colors.textMuted, paddingVertical: Spacing.xl, fontWeight: '500' },

  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: Spacing.lg },
  sheetHandle:    { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 16 },
  sheetTitle:     { fontSize: Typography.xl, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  branchItem:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  branchItemActive:{},
  branchItemIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  branchItemName: { fontSize: Typography.base, fontWeight: '600', color: Colors.text },
  branchItemCity: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 1 },
});

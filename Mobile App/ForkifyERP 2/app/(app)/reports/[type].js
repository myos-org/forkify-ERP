// app/(app)/reports/[type].js — Universal report screen
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { reportService } from '../../../src/services';
import { useBranch, usePermission } from '../../../src/hooks';
import { Colors, Typography, Radius, Shadow, Spacing } from '../../../src/theme';
import { Banner, ProgressBar, ScreenHeader} from '../../../src/components/common';
import { Ionicons } from '@expo/vector-icons';

const REPORT_CONFIG = {
  inventory: { title: '📦 Inventory Report',  icon: '📦', label: 'Inventory' },
  cost:      { title: '💰 Cost Report',        icon: '💰', label: 'Cost' },
  wastage:   { title: '🗑 Wastage Report',      icon: '🗑', label: 'Wastage' },
  sales:     { title: '🛒 Sales Report',        icon: '🛒', label: 'Sales' },
  branches:  { title: '🏪 Branch Comparison',   icon: '🏪', label: 'Branches' },
  supplier:  { title: '🚚 Supplier Report',     icon: '🚚', label: 'Supplier' },
};

const PERIODS = [
  { label: '7 Days',  from: 7  },
  { label: '30 Days', from: 30 },
  { label: '90 Days', from: 90 },
];

export default function ReportScreen({ type: propType } = {}) {
  const router  = useRouter();
  const params = useLocalSearchParams();
  const type = propType || params?.type || 'inventory';
  const { branchId } = useBranch();
  const { isAdmin }  = usePermission();

  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState(30);
  const [error, setError]   = useState(null);

  const config = REPORT_CONFIG[type] || { title: `📊 ${type} Report`, icon: '📊', label: type };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const toDate   = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - period * 86400000).toISOString().split('T')[0];
    const params   = { fromDate, toDate };

    try {
      let res;
      switch (type) {
        case 'inventory': res = await reportService.getInventory(branchId, params); break;
        case 'cost':      res = await reportService.getCost(branchId, params);      break;
        case 'wastage':   res = await reportService.getWastage(branchId, params);   break;
        case 'sales':     res = await reportService.getSales(branchId, params);     break;
        case 'branches':  res = await reportService.getBranches(params);             break;
        case 'supplier':  res = await reportService.getSupplier(branchId, params);  break;
        default:          res = await reportService.getSales(branchId, params);
      }
      setData(res.data);
    } catch { setError('Failed to load report data'); }
    finally  { setLoading(false); }
  }, [type, branchId, period]);

  useEffect(() => { load(); }, [load]);

  const renderRows = (rows = [], cols = []) => (
    <View style={S.tableWrap}>
      {/* Header */}
      <View style={[S.tableRow, S.tableHeader]}>
        {cols.map((c, i) => <Text key={i} style={[S.tableCell, S.tableHeaderText, c.flex && { flex: c.flex }]}>{c.label}</Text>)}
      </View>
      {/* Body */}
      {rows.length === 0
        ? <View style={S.emptyRow}><Text style={S.emptyRowText}>No data for this period</Text></View>
        : rows.map((row, ri) => (
          <View key={ri} style={[S.tableRow, ri % 2 === 1 && S.tableRowAlt]}>
            {cols.map((c, ci) => (
              <Text key={ci} style={[S.tableCell, c.flex && { flex: c.flex }, c.bold && { fontWeight: '700' }, c.color && { color: c.color }]}>
                {c.format ? c.format(row[c.key]) : String(row[c.key] ?? '—')}
              </Text>
            ))}
          </View>
        ))}
    </View>
  );

  const renderReport = () => {
    if (!data) return null;
    const rows = Array.isArray(data) ? data : data.rows || data.items || data.entries || [];

    switch (type) {
      case 'sales':
        return (
          <>
            <View style={S.summaryGrid}>
              {[
                { label: 'Total Revenue',  val: `₹${Number(data.totalRevenue || 0).toLocaleString('en-IN')}` },
                { label: 'Total Covers',   val: data.totalCovers || rows.reduce((s, r) => s + (r.quantitySold || 0), 0) },
                { label: 'Avg Order',      val: `₹${Number(data.avgOrderValue || 0).toFixed(0)}` },
                { label: 'Top Recipe',     val: data.topRecipe?.name || rows[0]?.recipeName || '—' },
              ].map((s, i) => (
                <View key={i} style={[S.summaryCard, Shadow.sm]}>
                  <Text style={S.summaryVal}>{s.val}</Text>
                  <Text style={S.summaryLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
            {renderRows(rows, [
              { label: 'Recipe', key: 'recipeName', flex: 2, bold: true },
              { label: 'Qty', key: 'quantitySold' },
              { label: 'Revenue', key: 'totalAmount', format: v => `₹${Number(v || 0).toFixed(0)}`, color: Colors.primary },
            ])}
          </>
        );

      case 'inventory':
        return renderRows(rows, [
          { label: 'Item', key: 'ingredientName', flex: 2, bold: true },
          { label: 'Stock', key: 'currentQuantity' },
          { label: 'Min', key: 'minStockLevel' },
          { label: 'Status', key: 'status' },
          { label: 'Value', key: 'totalValue', format: v => `₹${Number(v || 0).toFixed(0)}`, color: Colors.primary },
        ]);

      case 'cost':
        return (
          <>
            <View style={S.summaryGrid}>
              {[
                { label: 'Total Cost',   val: `₹${Number(data.totalCost || 0).toFixed(0)}` },
                { label: 'Food Cost %',  val: `${Number(data.foodCostPercent || 0).toFixed(1)}%` },
                { label: 'Gross Margin', val: `${Number(data.grossMarginPercent || 0).toFixed(1)}%` },
                { label: 'Wastage Cost', val: `₹${Number(data.wastageCost || 0).toFixed(0)}` },
              ].map((s, i) => (
                <View key={i} style={[S.summaryCard, Shadow.sm]}>
                  <Text style={S.summaryVal}>{s.val}</Text>
                  <Text style={S.summaryLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
            {renderRows(rows, [
              { label: 'Recipe', key: 'recipeName', flex: 2, bold: true },
              { label: 'Cost/Srv', key: 'costPerServing', format: v => `₹${Number(v || 0).toFixed(2)}` },
              { label: 'Total', key: 'totalCost', format: v => `₹${Number(v || 0).toFixed(0)}`, color: Colors.primary },
            ])}
          </>
        );

      case 'wastage':
        return (
          <>
            <View style={S.summaryGrid}>
              {[
                { label: 'Total Loss',   val: `₹${Number(data.totalLoss || 0).toFixed(0)}` },
                { label: 'Incidents',    val: data.totalIncidents || rows.length },
                { label: 'Top Reason',   val: data.topReason || '—' },
              ].map((s, i) => (
                <View key={i} style={[S.summaryCard, Shadow.sm]}>
                  <Text style={S.summaryVal}>{s.val}</Text>
                  <Text style={S.summaryLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
            {renderRows(rows, [
              { label: 'Item',   key: 'ingredientName', flex: 2, bold: true },
              { label: 'Qty',    key: 'quantity' },
              { label: 'Reason', key: 'reason' },
              { label: 'Loss',   key: 'costLoss', format: v => `₹${Number(v || 0).toFixed(0)}`, color: Colors.danger },
            ])}
          </>
        );

      case 'branches':
        return renderRows(rows, [
          { label: 'Branch',  key: 'branchName', flex: 2, bold: true },
          { label: 'Revenue', key: 'revenue',    format: v => `₹${Number(v || 0).toLocaleString('en-IN')}`, color: Colors.primary },
          { label: 'Orders',  key: 'orderCount' },
          { label: 'Waste%',  key: 'wastagePercent', format: v => `${Number(v || 0).toFixed(1)}%` },
        ]);

      case 'supplier':
        return renderRows(rows, [
          { label: 'Supplier',  key: 'supplierName', flex: 2, bold: true },
          { label: 'POs',       key: 'poCount' },
          { label: 'Total',     key: 'totalAmount', format: v => `₹${Number(v || 0).toFixed(0)}`, color: Colors.primary },
          { label: 'On-Time%',  key: 'onTimePercent', format: v => `${Number(v || 0).toFixed(0)}%` },
        ]);

      default:
        return <Text style={{ color: Colors.textMuted, padding: Spacing.lg }}>Report type not supported yet.</Text>;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={['top']}>
      <View style={S.header}>
        
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>{config.title}</Text>
          <Text style={S.headerSub}>Last {period} days</Text>
        </View>
        <TouchableOpacity style={S.refreshBtn} onPress={load} disabled={loading}>
          <Text>{loading ? '⏳' : '🔄'}</Text>
        </TouchableOpacity>
      </View>

      {/* Period picker */}
      <View style={S.periodRow}>
        {PERIODS.map(p => (
          <TouchableOpacity key={p.from} onPress={() => setPeriod(p.from)}
            style={[S.periodBtn, period === p.from && S.periodBtnActive]}>
            <Text style={[S.periodBtnText, period === p.from && S.periodBtnTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ paddingHorizontal: Spacing.lg }}>
        <Banner type="error" message={error} onDismiss={() => setError(null)} />
      </View>

      {loading
        ? <View style={S.centered}><ActivityIndicator color={Colors.primary} size="large" /><Text style={S.loadingText}>Generating report...</Text></View>
        : <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 }}>
            {renderReport()}
          </ScrollView>}
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: 12, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:     { width: 36, height: 36, backgroundColor: Colors.bg, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  headerTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.text },
  headerSub:   { fontSize: Typography.xs, color: Colors.textMuted },
  refreshBtn:  { width: 36, height: 36, backgroundColor: Colors.bg, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  periodRow:   { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  periodBtn:   { flex: 1, paddingVertical: 7, backgroundColor: Colors.card, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  periodBtnActive:    { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  periodBtnText:      { fontSize: Typography.sm, color: Colors.textSecondary },
  periodBtnTextActive:{ color: Colors.primary, fontWeight: '700' },
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: Typography.sm, color: Colors.textMuted },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  summaryCard: { flex: 1, minWidth: '45%', backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border },
  summaryVal:  { fontSize: Typography.lg, fontWeight: '800', color: Colors.text },
  summaryLabel:{ fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center' },

  tableWrap:       { backgroundColor: Colors.card, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  tableHeader:     { backgroundColor: '#f8fafc' },
  tableHeaderText: { fontWeight: '700', color: Colors.textSecondary, fontSize: Typography.xs, textTransform: 'uppercase' },
  tableRow:        { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  tableRowAlt:     { backgroundColor: '#fafafa' },
  tableCell:       { flex: 1, fontSize: Typography.sm, color: Colors.text },
  emptyRow:        { padding: Spacing.xl, alignItems: 'center' },
  emptyRowText:    { fontSize: Typography.sm, color: Colors.textMuted },
});

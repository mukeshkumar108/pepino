"use client";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import type { Invoice } from "@/lib/invoiceSchema";
import { invoiceTotalsQ } from "@/lib/totals";

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: "Helvetica" },
  h1: { fontSize: 16, marginBottom: 8 },
  h2: { fontSize: 12, marginTop: 12, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  table: { marginTop: 8, borderTopWidth: 1, borderColor: "#999" },
  th: { fontWeight: "bold" },
  cell: { paddingVertical: 4, borderBottomWidth: 1, borderColor: "#eee" },
});

export default function InvoicePDF({ invoice }: { invoice: Invoice }) {
  const { subtotal, tax, total } = invoiceTotalsQ(invoice);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Propuesta / Factura</Text>

        <View style={styles.row}>
          <View>
            <Text style={styles.th}>Cliente</Text>
            <Text>{invoice.client.name}</Text>
            {invoice.client.contact && <Text>{invoice.client.contact}</Text>}
          </View>
          <View>
            <Text style={styles.th}>Evento</Text>
            <Text>{invoice.event?.name}</Text>
            <Text>{invoice.event?.date}</Text>
            <Text>{invoice.event?.location}</Text>
          </View>
        </View>

        {invoice.groups.map((g) => (
          <View key={g.id}>
            <Text style={styles.h2}>{g.title}</Text>
            <View style={styles.table}>
              <View style={[styles.row, styles.cell]}>
                <Text style={{ width: "10%" }}>CANT</Text>
                <Text style={{ width: "55%" }}>Descripción</Text>
                <Text style={{ width: "15%", textAlign: "right" }}>Precio U.</Text>
                <Text style={{ width: "20%", textAlign: "right" }}>Total</Text>
              </View>
              {g.items.map((it) => (
                <View key={it.id} style={[styles.row, styles.cell]}>
                  <Text style={{ width: "10%" }}>{it.qty}</Text>
                  <Text style={{ width: "55%" }}>{it.desc}</Text>
                  <Text style={{ width: "15%", textAlign: "right" }}>
                    Q {it.unit.amount.toFixed(2)}
                  </Text>
                  <Text style={{ width: "20%", textAlign: "right" }}>
                    Q {(it.qty * it.unit.amount).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={{ marginTop: 10 }}>
          <View style={styles.row}>
            <Text>SUBTOTAL</Text>
            <Text>Q {subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text>IMPUESTOS</Text>
            <Text>Q {tax.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ fontSize: 12 }}>TOTAL</Text>
            <Text style={{ fontSize: 12 }}>Q {total.toFixed(2)}</Text>
          </View>
          {invoice.secondaryCurrency && (
            <Text style={{ marginTop: 4 }}>{invoice.secondaryCurrency.rateNote}</Text>
          )}
        </View>

        {invoice.bank && (
          <>
            <Text style={styles.h2}>Datos bancarios</Text>
            {invoice.bank.gtq && (
              <Text>
                Q: {invoice.bank.gtq.bank} – {invoice.bank.gtq.type} – {invoice.bank.gtq.account} – {invoice.bank.gtq.name}
              </Text>
            )}
            {invoice.bank.usd && (
              <Text>
                USD: {invoice.bank.usd.bank} – {invoice.bank.usd.type} – {invoice.bank.usd.account} – {invoice.bank.usd.name}
              </Text>
            )}
          </>
        )}

        {invoice.terms?.length ? (
          <>
            <Text style={styles.h2}>Condiciones del servicio</Text>
            {invoice.terms.map((t, i) => (
              <Text key={i}>• {t}</Text>
            ))}
          </>
        ) : null}

        <Text style={styles.h2}>Confirmación de presupuesto</Text>
        <Text>Firma: ________________________________</Text>
      </Page>
    </Document>
  );
}
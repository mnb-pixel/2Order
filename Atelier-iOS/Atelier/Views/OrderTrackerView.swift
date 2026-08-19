import SwiftUI

struct OrderTrackerView: View {
    @EnvironmentObject var store: AtelierStore

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    if store.orders.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "tray")
                                .font(.system(size: 40))
                                .foregroundColor(.secondary)
                            Text("Noch keine Bestellungen vorhanden.")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                        }
                        .padding(.top, 80)
                    } else {
                        ForEach(store.orders) { order in
                            VStack(alignment: .leading, spacing: 16) {
                                // Order Header
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("AUFTRAG #\(order.orderNumber)")
                                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                                            .foregroundColor(.secondary)
                                        Text(order.producerName)
                                            .font(.system(size: 16, weight: .bold))
                                    }
                                    Spacer()
                                    Text(String(format: "CHF %.2f", order.totalAmount))
                                        .font(.system(size: 15, weight: .bold, design: .monospaced))
                                }

                                HStack(spacing: 12) {
                                    Label(order.fulfillmentType == .pickup ? "Abholung" : "Versand", systemImage: order.fulfillmentType == .pickup ? "figure.walk" : "shippingbox")
                                        .font(.system(size: 10, weight: .medium))
                                        .foregroundColor(.secondary)
                                    if order.isGift {
                                        Label("Geschenk", systemImage: "gift.fill")
                                            .font(.system(size: 10, weight: .medium))
                                            .foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                                    }
                                }

                                Divider()

                                // Fulfillment-aware Status Stepper — a pickup
                                // order never shows shipping language ("unterwegs
                                // zu Ihnen") and vice versa.
                                VStack(alignment: .leading, spacing: 10) {
                                    Text("PRODUKTIONSSTATUS")
                                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                                        .foregroundColor(.secondary)

                                    ForEach(OrderStatus.steps(for: order.fulfillmentType), id: \.self) { st in
                                        let isDone = st.stepIndex <= order.status.stepIndex
                                        let isCurrent = st == order.status

                                        HStack(spacing: 12) {
                                            Circle()
                                                .fill(isCurrent ? Color(red: 0.61, green: 0.29, blue: 0.18) : isDone ? Color.black : Color(white: 0.85))
                                                .frame(width: 10, height: 10)

                                            Text(st.title(for: order.fulfillmentType))
                                                .font(.system(size: 12, weight: isCurrent ? .bold : .regular))
                                                .foregroundColor(isCurrent ? .primary : isDone ? .secondary : Color(white: 0.6))

                                            Spacer()

                                            if isCurrent {
                                                Text("AKTUELL")
                                                    .font(.system(size: 8, weight: .bold, design: .monospaced))
                                                    .foregroundColor(.white)
                                                    .padding(.horizontal, 6)
                                                    .padding(.vertical, 2)
                                                    .background(Color(red: 0.61, green: 0.29, blue: 0.18))
                                                    .cornerRadius(3)
                                            }
                                        }
                                    }
                                }

                                // Items Breakdown
                                ForEach(order.items) { item in
                                    VStack(alignment: .leading, spacing: 6) {
                                        Text("\(item.quantity)x \(item.product.title)")
                                            .font(.system(size: 13, weight: .semibold))

                                        if let label = item.customLabel {
                                            Text("\"\(label.headline)\"")
                                                .font(.system(size: 11, design: .serif))
                                                .italic()
                                                .foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                                        }

                                        if let recipe = item.recipe {
                                            Text(recipe.map { "\($0.ratio)% \($0.componentName)" }.joined(separator: " · "))
                                                .font(.system(size: 10, design: .monospaced))
                                                .foregroundColor(.secondary)
                                        }

                                        if !item.aggregatedAllergens.isEmpty {
                                            Text("Enthält: \(item.aggregatedAllergens.map { $0.label }.joined(separator: ", "))")
                                                .font(.system(size: 9, weight: .semibold))
                                                .foregroundColor(.orange)
                                        }
                                    }
                                    .padding(10)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(Color(UIColor.tertiarySystemGroupedBackground))
                                    .cornerRadius(8)
                                }

                            }
                            .padding()
                            .background(Color(UIColor.secondarySystemGroupedBackground))
                            .cornerRadius(14)
                            .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
                        }
                    }
                }
                .padding()
            }
            .background(Color(UIColor.systemGroupedBackground))
            .navigationTitle("Aufträge")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

// MARK: - Customer-facing Quote / Offerte tracker. Mirrors OrderTrackerView
// but for the "Anfrage → Offerte → Rechnung" path — the customer accepts or
// declines here; the producer then issues the invoice on their side.
struct MyQuotesView: View {
    @EnvironmentObject var store: AtelierStore

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    if store.quotes.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "doc.text")
                                .font(.system(size: 40))
                                .foregroundColor(.secondary)
                            Text("Noch keine Anfragen gestellt.")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                        }
                        .padding(.top, 80)
                    } else {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(alignment: .top, spacing: 8) {
                                Image(systemName: "shield.checkerboard")
                                    .foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                                Text("Bei Anfragen erhalten Sie eine individuelle Offerte direkt von der Manufaktur. Nach Annahme stellt Ihnen die Manufaktur eine Rechnung — die Zahlung erfolgt direkt an sie, nicht über ATELIER.")
                                    .font(.system(size: 11))
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding()
                        .background(Color(UIColor.secondarySystemGroupedBackground))
                        .cornerRadius(12)

                        ForEach(store.quotes) { quote in
                            MyQuoteRow(quote: quote, invoice: store.invoices.first { $0.quoteId == quote.id })
                        }
                    }
                }
                .padding()
            }
            .background(Color(UIColor.systemGroupedBackground))
            .navigationTitle("Anfragen")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

private struct MyQuoteRow: View {
    @EnvironmentObject var store: AtelierStore
    let quote: Quote
    let invoice: Invoice?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(quote.quoteNumber).font(.system(size: 9, design: .monospaced)).foregroundColor(.secondary)
                    Text(quote.producerName).font(.system(size: 14, weight: .bold))
                }
                Spacer()
                Text(quote.status.title)
                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                    .padding(.horizontal, 8).padding(.vertical, 4)
                    .background(Color(UIColor.tertiarySystemGroupedBackground))
                    .cornerRadius(4)
            }

            ForEach(quote.items) { item in
                Text("\(item.quantity)x \(item.productTitle)").font(.system(size: 12))
            }

            if quote.status == .quoted {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Offertpreis: CHF \(String(format: "%.2f", quote.quotedPrice ?? 0))")
                        .font(.system(size: 13, weight: .bold))
                    if let note = quote.quotedNote, !note.isEmpty {
                        Text(note).font(.system(size: 11)).foregroundColor(.secondary)
                    }
                    HStack {
                        Button(action: { store.acceptQuote(quoteId: quote.id) }) {
                            Text("Offerte annehmen")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 14).padding(.vertical, 8)
                                .background(Color.black)
                                .cornerRadius(8)
                        }
                        Button(action: { store.declineQuote(quoteId: quote.id) }) {
                            Text("Ablehnen")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.red)
                        }
                    }
                }
            }

            if quote.status == .accepted {
                Text("Angenommen — die Manufaktur stellt Ihnen in Kürze die Rechnung aus.")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }

            if let invoice = invoice {
                VStack(alignment: .leading, spacing: 4) {
                    Text("RECHNUNG \(invoice.invoiceNumber)").font(.system(size: 10, weight: .bold, design: .monospaced))
                    Text("Betrag: CHF \(String(format: "%.2f", invoice.amount)) · Fällig: \(invoice.dueDate)")
                        .font(.system(size: 10)).foregroundColor(.secondary)
                    Text(invoice.status == "paid" ? "Zahlung bestätigt" : "Bitte direkt bei der Manufaktur begleichen (z. B. Swiss-QR-Rechnung).")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(invoice.status == "paid" ? .green : .orange)
                }
                .padding(8)
                .background(Color(UIColor.tertiarySystemGroupedBackground))
                .cornerRadius(8)
            }
        }
        .padding()
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(14)
        .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
    }
}

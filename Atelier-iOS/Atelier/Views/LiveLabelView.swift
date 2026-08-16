import SwiftUI

struct LiveLabelView: View {
    let producerName: String
    let customLabel: CustomLabelData
    let recipe: [RecipeItem]?
    let selections: [String: String]?
    let weightText: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Top Bar
            HStack {
                Text("✦ \(producerName.uppercased())")
                    .font(.system(size: 10, weight: .bold, design: .default))
                    .tracking(2.0)
                    .foregroundColor(.black)
                
                Spacer()
                
                Text("MADE-TO-ORDER")
                    .font(.system(size: 8, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(Color.black)
                    .cornerRadius(2)
            }
            
            Divider()
                .background(Color.black)
            
            // Headline
            Text(customLabel.headline.isEmpty ? "Signature Custom Roast" : customLabel.headline)
                .font(headlineFont)
                .foregroundColor(.black)
                .lineLimit(2)
                .padding(.top, 2)
            
            // Subtitle
            Text(customLabel.subtitle)
                .font(.system(size: 11, weight: .regular))
                .foregroundColor(Color(white: 0.35))
            
            // Dedication if present
            if !customLabel.dedication.isEmpty {
                Text("\"\(customLabel.dedication)\"")
                    .font(.system(size: 11, weight: .regular, design: .serif))
                    .italic()
                    .foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                    .padding(6)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(white: 0.95))
                    .cornerRadius(4)
            }
            
            // Recipe Breakdown Bar
            if let recipe = recipe, !recipe.isEmpty {
                VStack(alignment: .leading, spacing: 3) {
                    Text("SPEZIFIKATION & REZEPTUR")
                        .font(.system(size: 8, weight: .bold, design: .monospaced))
                        .foregroundColor(Color(white: 0.4))
                        .tracking(1.0)
                    
                    let recipeString = recipe.map { "\($0.ratio)% \($0.componentName) (\($0.grams)g)" }.joined(separator: " · ")
                    Text(recipeString)
                        .font(.system(size: 9.5, weight: .medium, design: .monospaced))
                        .foregroundColor(Color.black)
                        .lineLimit(2)
                }
                .padding(.top, 4)
            }
            
            Spacer(minLength: 4)
            
            Divider()
                .background(Color.black)
            
            // Footer Meta
            HStack {
                VStack(alignment: .leading, spacing: 1) {
                    Text("BATCH")
                        .font(.system(size: 7, weight: .bold, design: .monospaced))
                        .foregroundColor(Color(white: 0.5))
                    Text(customLabel.batchNumber)
                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                        .foregroundColor(.black)
                }
                
                Spacer()
                
                VStack(alignment: .leading, spacing: 1) {
                    Text("DATUM")
                        .font(.system(size: 7, weight: .bold, design: .monospaced))
                        .foregroundColor(Color(white: 0.5))
                    Text(customLabel.dateString)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.black)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 1) {
                    Text("NETTO")
                        .font(.system(size: 7, weight: .bold, design: .monospaced))
                        .foregroundColor(Color(white: 0.5))
                    Text(weightText)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.black)
                }
                
                Spacer()
                
                Text("+ SWISS CRAFT")
                    .font(.system(size: 8, weight: .bold, design: .monospaced))
                    .foregroundColor(.black)
                    .padding(.horizontal, 4)
                    .padding(.vertical, 2)
                    .overlay(
                        RoundedRectangle(cornerRadius: 2)
                            .stroke(Color.black, lineWidth: 0.8)
                    )
            }
        }
        .padding(14)
        .background(Color.white)
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(Color.black, lineWidth: 1.5)
        )
        .cornerRadius(6)
        .shadow(color: Color.black.opacity(0.12), radius: 8, x: 0, y: 4)
    }
    
    private var headlineFont: Font {
        switch customLabel.fontStyle {
        case "editorial-serif":
            return .system(size: 16, weight: .medium, design: .serif).italic()
        case "minimal-mono":
            return .system(size: 14, weight: .semibold, design: .monospaced)
        default:
            return .system(size: 15, weight: .bold, design: .default)
        }
    }
}

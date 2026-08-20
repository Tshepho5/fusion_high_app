import 'package:flutter_test/flutter_test.dart';
import 'package:fusion_high_app/main.dart';

void main() {
  testWidgets('Fusion High App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const FusionHighApp());
    expect(find.text('FUSION HIGH'), findsWidgets);
  });
}

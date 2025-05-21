# 관리자 대시보드 차트 컴포넌트

이 디렉토리에는 카페 추천 시스템의 관리자 대시보드에 사용되는 차트 컴포넌트가 포함되어 있습니다.

## 컴포넌트 목록

### AdvancedMenuChart

메뉴 판매량을 시각화하는 고급 차트 컴포넌트입니다. 다음 세 가지 시각화 옵션을 제공합니다:

- **판매량 차트**: 상위 10개 메뉴의 판매량과 매출을 막대 차트로 표시
- **카테고리 레이더**: 카테고리별 판매량을 레이더 차트로 시각화
- **카테고리별 분석**: 카테고리별로 그룹화된 메뉴 정보를 계층적으로 표시

### OrderMetricsCard

주문 지표를 시각화하는 메트릭스 카드 컴포넌트 세트입니다. 다음 컴포넌트들을 포함합니다:

- **CompletionRateCard**: 주문 완료율을 진행 막대로 표시
- **CancellationRateCard**: 주문 취소율을 진행 막대로 표시
- **AverageOrderValueCard**: 평균 주문 금액과 변화량 표시
- **TotalSalesCard**: 총 매출액과 변화량 표시

## 사용 예시

```tsx
// 메뉴 판매량 차트 사용
<AdvancedMenuChart data={orderAnalytics.menu_sales} />

// 메트릭스 카드 그리드 사용
<OrderMetricsGrid
  data={{
    completionRate: 85.2,
    cancellationRate: 14.8,
    completedOrders: 123,
    cancelledOrders: 21,
    totalOrders: 144,
    avgOrderValue: 15000,
    totalSales: 2160000
  }}
/>
``` 
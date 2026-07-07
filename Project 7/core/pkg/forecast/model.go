// Package forecast provides time-series forecasting for financial metrics.
package forecast

import (
	"math"
	"sort"
	"time"

	"github.com/shopspring/decimal"
	"github.com/vaultflow/vaultflow/core/pkg/model"
)

// DataPoint is a single time-series observation.
type DataPoint struct {
	Time  time.Time       `json:"time"`
	Value decimal.Decimal `json:"value"`
}

// ForecastResult holds projected values with confidence bounds.
type ForecastResult struct {
	Horizon      time.Time       `json:"horizon"`
	Predicted    model.Money     `json:"predicted"`
	LowerBound   model.Money     `json:"lower_bound"`
	UpperBound   model.Money     `json:"upper_bound"`
	Confidence   float64         `json:"confidence"`
}

// LinearForecast projects future values using simple linear regression.
// It returns forecasts for the next `months` calendar months.
func LinearForecast(history []DataPoint, months int, currency model.Currency) []ForecastResult {
	if len(history) < 2 {
		return nil
	}

	sort.Slice(history, func(i, j int) bool { return history[i].Time.Before(history[j].Time) })

	// Convert to x/y where x is days since first observation.
	origin := history[0].Time
	n := float64(len(history))
	var sumX, sumY, sumXY, sumX2 float64

	for _, dp := range history {
		x := dp.Time.Sub(origin).Hours() / 24
		y, _ := dp.Value.Float64()
		sumX += x
		sumY += y
		sumXY += x * y
		sumX2 += x * x
	}

	slope := (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX)
	intercept := (sumY - slope*sumX) / n

	// compute residual std dev for confidence bounds
	var resSum float64
	for _, dp := range history {
		x := dp.Time.Sub(origin).Hours() / 24
		y, _ := dp.Value.Float64()
		pred := slope*x + intercept
		diff := y - pred
		resSum += diff * diff
	}
	stdDev := math.Sqrt(resSum / n)

	results := make([]ForecastResult, 0, months)
	now := time.Now()

	for i := 1; i <= months; i++ {
		horizon := addMonths(now, i)
		x := horizon.Sub(origin).Hours() / 24
		predicted := slope*x + intercept

		confidence := math.Max(0.5, 1.0-float64(i)*0.05)
		margin := stdDev * confidence

		results = append(results, ForecastResult{
			Horizon:    horizon,
			Predicted:  model.Money{Amount: decimal.NewFromFloat(math.Max(0, predicted)), Currency: currency},
			LowerBound: model.Money{Amount: decimal.NewFromFloat(math.Max(0, predicted-margin)), Currency: currency},
			UpperBound: model.Money{Amount: decimal.NewFromFloat(predicted + margin), Currency: currency},
			Confidence: confidence,
		})
	}

	return results
}

// ExpensesForecast builds a forecast from a slice of monthly expense totals.
func ExpensesForecast(monthlyTotals map[string]float64, months int, currency model.Currency) []ForecastResult {
	history := make([]DataPoint, 0, len(monthlyTotals))
	for monthStr, total := range monthlyTotals {
		t, err := time.Parse("2006-01", monthStr)
		if err != nil {
			continue
		}
		history = append(history, DataPoint{Time: t, Value: decimal.NewFromFloat(total)})
	}
	return LinearForecast(history, months, currency)
}

func addMonths(t time.Time, months int) time.Time {
	return t.AddDate(0, months, 0)
}

package server

import "time"

var monthLabels = [...]string{"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}

type ActivityDayCellResponse struct {
	Date      string `json:"date"`
	Count     int    `json:"count"`
	DayOfWeek int    `json:"dayOfWeek"`
}

type ActivityMonthLabelResponse struct {
	Label string `json:"label"`
	Col   int    `json:"col"`
}

type ActivityDayGridYearResponse struct {
	Year        int                          `json:"year"`
	Weeks       [][]ActivityDayCellResponse  `json:"weeks"`
	MonthLabels []ActivityMonthLabelResponse `json:"monthLabels"`
}

type ActivityWeekCellResponse struct {
	Count    int    `json:"count"`
	Month    int    `json:"month"`
	FromDate string `json:"fromDate"`
	ToDate   string `json:"toDate"`
}

type ActivityWeekGridYearResponse struct {
	Year        int                          `json:"year"`
	Cells       []ActivityWeekCellResponse   `json:"cells"`
	MonthLabels []ActivityMonthLabelResponse `json:"monthLabels"`
}

type ActivityMonthCellResponse struct {
	ShortLabel string `json:"shortLabel"`
	Count      int    `json:"count"`
	FromDate   string `json:"fromDate"`
	ToDate     string `json:"toDate"`
}

func buildActivityBuckets(days []ActivityDayResponse, now time.Time) ([]ActivityDayGridYearResponse, []ActivityWeekGridYearResponse, []ActivityMonthCellResponse) {
	if len(days) == 0 {
		return []ActivityDayGridYearResponse{}, []ActivityWeekGridYearResponse{}, []ActivityMonthCellResponse{}
	}
	counts := make(map[string]int, len(days))
	for _, day := range days {
		counts[day.Date] = day.Count
	}
	first, err := time.Parse("2006-01-02", days[0].Date)
	if err != nil {
		return []ActivityDayGridYearResponse{}, []ActivityWeekGridYearResponse{}, []ActivityMonthCellResponse{}
	}
	now = now.UTC()
	dayYears := make([]ActivityDayGridYearResponse, 0, now.Year()-first.Year()+1)
	weekYears := make([]ActivityWeekGridYearResponse, 0, now.Year()-first.Year()+1)
	for year := first.Year(); year <= now.Year(); year++ {
		yearStart := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC)
		yearEnd := time.Date(year, 12, 31, 0, 0, 0, 0, time.UTC)
		if year == now.Year() {
			yearEnd = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
		}
		start := yearStart.AddDate(0, 0, -int(yearStart.Weekday()))
		weeks := make([][]ActivityDayCellResponse, 0, 54)
		weekCells := make([]ActivityWeekCellResponse, 0, 54)
		for cursor := start; !cursor.After(yearEnd); {
			week := make([]ActivityDayCellResponse, 0, 7)
			fromDate := cursor.Format("2006-01-02")
			toDate, weekCount, month := fromDate, 0, int(cursor.Month())-1
			for i := 0; i < 7 && !cursor.After(yearEnd); i++ {
				date := cursor.Format("2006-01-02")
				count := counts[date]
				week = append(week, ActivityDayCellResponse{Date: date, Count: count, DayOfWeek: int(cursor.Weekday())})
				weekCount += count
				toDate = date
				cursor = cursor.AddDate(0, 0, 1)
			}
			weeks = append(weeks, week)
			weekCells = append(weekCells, ActivityWeekCellResponse{Count: weekCount, Month: month, FromDate: fromDate, ToDate: toDate})
		}
		dayLabels := make([]ActivityMonthLabelResponse, 0, 12)
		lastMonth := time.Month(0)
		for col, week := range weeks {
			date, _ := time.Parse("2006-01-02", week[0].Date)
			if date.Month() != lastMonth {
				dayLabels = append(dayLabels, ActivityMonthLabelResponse{Label: monthLabels[date.Month()-1], Col: col})
				lastMonth = date.Month()
			}
		}
		weekLabels := make([]ActivityMonthLabelResponse, 0, 12)
		lastMonthIndex := -1
		for col, cell := range weekCells {
			if cell.Month != lastMonthIndex {
				weekLabels = append(weekLabels, ActivityMonthLabelResponse{Label: monthLabels[cell.Month], Col: col})
				lastMonthIndex = cell.Month
			}
		}
		dayYears = append(dayYears, ActivityDayGridYearResponse{Year: year, Weeks: weeks, MonthLabels: dayLabels})
		weekYears = append(weekYears, ActivityWeekGridYearResponse{Year: year, Cells: weekCells, MonthLabels: weekLabels})
	}
	months := make([]ActivityMonthCellResponse, 0)
	for year := first.Year(); year <= now.Year(); year++ {
		startMonth, endMonth := time.January, time.December
		if year == first.Year() {
			startMonth = first.Month()
		}
		if year == now.Year() {
			endMonth = now.Month()
		}
		for month := startMonth; month <= endMonth; month++ {
			from := time.Date(year, month, 1, 0, 0, 0, 0, time.UTC)
			to := from.AddDate(0, 1, -1)
			count := 0
			for cursor := from; !cursor.After(to); cursor = cursor.AddDate(0, 0, 1) {
				count += counts[cursor.Format("2006-01-02")]
			}
			months = append(months, ActivityMonthCellResponse{ShortLabel: monthLabels[month-1], Count: count, FromDate: from.Format("2006-01-02"), ToDate: to.Format("2006-01-02")})
		}
	}
	return dayYears, weekYears, months
}

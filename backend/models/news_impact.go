package models

type NewsImpact struct {
	ID             uint    `gorm:"primaryKey" json:"id"`
	NewsID         uint    `gorm:"index;not null" json:"newsId"`
	SubjectID      uint    `gorm:"index;not null" json:"subjectId"`
	Subject        User    `gorm:"foreignKey:SubjectID" json:"subject"`
	FinalImpactDir string  `gorm:"type:varchar(20);default:'PENDING'" json:"finalImpactDir"` // POSITIVE, NEGATIVE, NEUTRAL, PENDING
	FinalImpactPct float64 `json:"finalImpactPct"`
}

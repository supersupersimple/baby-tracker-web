import { startOfDay, endOfDay, subDays, format } from 'date-fns'

export function getDateRange(days) {
  const endDate = new Date()
  const startDate = subDays(endDate, days - 1)
  return { startDate: startOfDay(startDate), endDate: endOfDay(endDate) }
}

export function aggregateFeedingData(activities, days) {
  const { startDate, endDate } = getDateRange(days)
  const dailyFeeding = {}
  
  const feedingActivities = activities.filter(activity => 
    activity.type === 'FEEDING' && 
    activity.amount && 
    activity.fromDate >= startDate && 
    activity.fromDate <= endDate
  )
  
  feedingActivities.forEach(activity => {
    const dateKey = format(new Date(activity.fromDate), 'yyyy-MM-dd')
    if (!dailyFeeding[dateKey]) {
      dailyFeeding[dateKey] = 0
    }
    dailyFeeding[dateKey] += activity.amount || 0
  })
  
  const chartData = []
  for (let i = 0; i < days; i++) {
    const date = subDays(endDate, days - 1 - i)
    const dateKey = format(date, 'yyyy-MM-dd')
    const dateLabel = format(date, 'MMM d')
    
    chartData.push({
      date: dateKey,
      dateLabel,
      amount: dailyFeeding[dateKey] || 0
    })
  }
  
  return chartData
}

export function aggregateSleepData(activities, days) {
  const { startDate, endDate } = getDateRange(days)
  const dailySleep = {}
  
  const sleepActivities = activities.filter(activity => 
    activity.type === 'SLEEPING' && 
    activity.fromDate && 
    activity.toDate &&
    activity.fromDate >= startDate && 
    activity.fromDate <= endDate
  )
  
  sleepActivities.forEach(activity => {
    const sleepStart = new Date(activity.fromDate)
    const sleepEnd = new Date(activity.toDate)
    const durationHours = (sleepEnd - sleepStart) / (1000 * 60 * 60)
    
    const dateKey = format(sleepStart, 'yyyy-MM-dd')
    if (!dailySleep[dateKey]) {
      dailySleep[dateKey] = 0
    }
    dailySleep[dateKey] += durationHours
  })
  
  const chartData = []
  for (let i = 0; i < days; i++) {
    const date = subDays(endDate, days - 1 - i)
    const dateKey = format(date, 'yyyy-MM-dd')
    const dateLabel = format(date, 'MMM d')
    
    chartData.push({
      date: dateKey,
      dateLabel,
      hours: Math.round((dailySleep[dateKey] || 0) * 10) / 10
    })
  }
  
  return chartData
}

export function aggregateDiaperingData(activities, days) {
  const { startDate, endDate } = getDateRange(days)
  const dailyDiaper = {}
  
  const diaperActivities = activities.filter(activity => 
    activity.type === 'DIAPERING' &&
    activity.fromDate >= startDate && 
    activity.fromDate <= endDate
  )
  
  diaperActivities.forEach(activity => {
    const dateKey = format(new Date(activity.fromDate), 'yyyy-MM-dd')
    if (!dailyDiaper[dateKey]) {
      dailyDiaper[dateKey] = { pee: 0, poo: 0 }
    }

    const subtypeUpper = activity.subtype?.toUpperCase()

    if (subtypeUpper === 'PEE') {
      dailyDiaper[dateKey].pee++
    } else if (subtypeUpper === 'POO') {
      dailyDiaper[dateKey].poo++
    } else if (subtypeUpper === 'PEEPOO') {
      // Combined pee and poo - count both
      dailyDiaper[dateKey].pee++
      dailyDiaper[dateKey].poo++
    }
  })
  
  const chartData = []
  for (let i = 0; i < days; i++) {
    const date = subDays(endDate, days - 1 - i)
    const dateKey = format(date, 'yyyy-MM-dd')
    const dateLabel = format(date, 'MMM d')

    chartData.push({
      date: dateKey,
      dateLabel,
      pee: dailyDiaper[dateKey]?.pee || 0,
      poo: dailyDiaper[dateKey]?.poo || 0
    })
  }


  return chartData
}

export function aggregateGrowthData(activities, days) {
  const { startDate, endDate } = getDateRange(days)
  const dailyWeight = {}
  const dailyHeight = {}
  
  const growthActivities = activities.filter(activity => 
    activity.type === 'GROWTH' &&
    activity.fromDate >= startDate && 
    activity.fromDate <= endDate
  )
  
  growthActivities.forEach(activity => {
    const dateKey = format(new Date(activity.fromDate), 'yyyy-MM-dd')
    
    if (activity.subtype === 'WEIGHT' && activity.amount) {
      dailyWeight[dateKey] = activity.amount
    } else if (activity.subtype === 'HEIGHT' && activity.amount) {
      dailyHeight[dateKey] = activity.amount
    }
  })
  
  const chartData = []
  for (let i = 0; i < days; i++) {
    const date = subDays(endDate, days - 1 - i)
    const dateKey = format(date, 'yyyy-MM-dd')
    const dateLabel = format(date, 'MMM d')
    
    chartData.push({
      date: dateKey,
      dateLabel,
      weight: dailyWeight[dateKey] || null,
      height: dailyHeight[dateKey] || null
    })
  }
  
  return chartData.filter(item => item.weight !== null || item.height !== null)
}

export function aggregateLeisureData(activities, days) {
  const { startDate, endDate } = getDateRange(days)
  const dailyLeisure = {}
  
  const leisureActivities = activities.filter(activity => 
    activity.type === 'LEISURE' && 
    activity.fromDate && 
    activity.toDate &&
    activity.fromDate >= startDate && 
    activity.fromDate <= endDate
  )
  
  leisureActivities.forEach(activity => {
    const playStart = new Date(activity.fromDate)
    const playEnd = new Date(activity.toDate)
    const durationHours = (playEnd - playStart) / (1000 * 60 * 60)
    
    const dateKey = format(playStart, 'yyyy-MM-dd')
    if (!dailyLeisure[dateKey]) {
      dailyLeisure[dateKey] = 0
    }
    dailyLeisure[dateKey] += durationHours
  })
  
  const chartData = []
  for (let i = 0; i < days; i++) {
    const date = subDays(endDate, days - 1 - i)
    const dateKey = format(date, 'yyyy-MM-dd')
    const dateLabel = format(date, 'MMM d')
    
    chartData.push({
      date: dateKey,
      dateLabel,
      hours: Math.round((dailyLeisure[dateKey] || 0) * 10) / 10
    })
  }
  
  return chartData
}

export function calculateSummaryStats(chartData, type) {
  if (!chartData || chartData.length === 0) {
    return {}
  }
  
  switch (type) {
    case 'feeding':
      const totalFeeding = chartData.reduce((sum, item) => sum + item.amount, 0)
      const avgFeeding = Math.round(totalFeeding / chartData.length)
      const maxFeeding = Math.max(...chartData.map(item => item.amount))
      const minFeeding = Math.min(...chartData.filter(item => item.amount > 0).map(item => item.amount))
      const maxDay = chartData.find(item => item.amount === maxFeeding)
      const minDay = chartData.find(item => item.amount === minFeeding)
      
      return {
        total: `${totalFeeding.toLocaleString()} ml`,
        average: `${avgFeeding} ml/day`,
        highest: maxDay ? `${maxFeeding} ml (${maxDay.dateLabel})` : 'N/A',
        lowest: minDay && minFeeding < Infinity ? `${minFeeding} ml (${minDay.dateLabel})` : 'N/A'
      }
      
    case 'sleep':
      const totalSleep = chartData.reduce((sum, item) => sum + item.hours, 0)
      const avgSleep = Math.round((totalSleep / chartData.length) * 10) / 10
      const maxSleep = Math.max(...chartData.map(item => item.hours))
      const minSleep = Math.min(...chartData.filter(item => item.hours > 0).map(item => item.hours))
      const maxSleepDay = chartData.find(item => item.hours === maxSleep)
      const minSleepDay = chartData.find(item => item.hours === minSleep)
      
      return {
        average: `${avgSleep} hrs/day`,
        total: `${Math.round(totalSleep * 10) / 10} hrs total`,
        longest: maxSleepDay ? `${maxSleep} hrs (${maxSleepDay.dateLabel})` : 'N/A',
        shortest: minSleepDay && minSleep < Infinity ? `${minSleep} hrs (${minSleepDay.dateLabel})` : 'N/A'
      }
      
    case 'diapering':
      const totalPee = chartData.reduce((sum, item) => sum + item.pee, 0)
      const totalPoo = chartData.reduce((sum, item) => sum + item.poo, 0)
      const avgPeeRaw = totalPee / chartData.length
      const avgPooRaw = totalPoo / chartData.length

      // Use one decimal place for better precision, or show as fraction if less than 1
      const avgPee = avgPeeRaw >= 1 ? Math.round(avgPeeRaw * 10) / 10 : Math.ceil(avgPeeRaw * 10) / 10
      const avgPoo = avgPooRaw >= 1 ? Math.round(avgPooRaw * 10) / 10 : Math.ceil(avgPooRaw * 10) / 10

      return {
        totalPee: `${totalPee} changes`,
        totalPoo: `${totalPoo} changes`,
        avgPee: `${avgPee}/day average`,
        avgPoo: `${avgPoo}/day average`
      }
      
    case 'growth':
      const weightEntries = chartData.filter(item => item.weight !== null)
      const heightEntries = chartData.filter(item => item.height !== null)
      
      const stats = {}
      
      if (weightEntries.length > 1) {
        const firstWeight = weightEntries[0].weight
        const lastWeight = weightEntries[weightEntries.length - 1].weight
        const weightGain = lastWeight - firstWeight
        stats.weightGain = `${weightGain > 0 ? '+' : ''}${weightGain.toFixed(1)} kg`
        stats.currentWeight = `${lastWeight} kg`
      }
      
      if (heightEntries.length > 1) {
        const firstHeight = heightEntries[0].height
        const lastHeight = heightEntries[heightEntries.length - 1].height
        const heightGain = lastHeight - firstHeight
        stats.heightGain = `${heightGain > 0 ? '+' : ''}${heightGain.toFixed(1)} cm`
        stats.currentHeight = `${lastHeight} cm`
      }
      
      return stats
      
    case 'leisure':
      const totalPlayTime = chartData.reduce((sum, item) => sum + item.hours, 0)
      const avgPlayTime = Math.round((totalPlayTime / chartData.length) * 10) / 10
      const maxPlay = Math.max(...chartData.map(item => item.hours))
      const maxPlayDay = chartData.find(item => item.hours === maxPlay)
      
      return {
        total: `${Math.round(totalPlayTime * 10) / 10} hrs total`,
        average: `${avgPlayTime} hrs/day`,
        mostActive: maxPlayDay && maxPlay > 0 ? `${maxPlay} hrs (${maxPlayDay.dateLabel})` : 'N/A',
        activeDays: chartData.filter(item => item.hours > 0).length
      }
      
    default:
      return {}
  }
}
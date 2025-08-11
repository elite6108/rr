import React, { useState, useEffect } from 'react';
import { ArrowRight, PieChart, LineChart, BarChart, ChevronLeft, Table } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveBar } from '@nivo/bar';

interface HSAccidentsAnnualStatsProps {
  onBack: () => void;
}

type ViewType = 'pie' | 'line' | 'bar' | 'table';
type PeriodType = 'calendar' | 'fiscal' | 'rolling';

export function HSAccidentsAnnualStats({ onBack }: HSAccidentsAnnualStatsProps) {
  const [viewType, setViewType] = useState<ViewType>('bar');
  const [periodType, setPeriodType] = useState<PeriodType>('calendar');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [periodType]);

  // Fetch company logo
  useEffect(() => {
    const fetchCompanyLogo = async () => {
      try {
        const { data, error } = await supabase
          .from('company_settings')
          .select('logo_url')
          .single();

        if (error) throw error;
        if (data?.logo_url) {
          setCompanyLogo(data.logo_url);
        }
      } catch (error) {
        console.error('Error fetching company logo:', error);
      }
    };

    fetchCompanyLogo();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      let startDate, endDate;
      const today = new Date();

      switch (periodType) {
        case 'calendar':
          startDate = new Date(today.getFullYear(), 0, 1); // Jan 1
          endDate = new Date(today.getFullYear(), 11, 31); // Dec 31
          break;
        case 'fiscal':
          startDate = new Date(today.getFullYear(), 3, 1); // April 1
          endDate = new Date(today.getFullYear() + 1, 2, 31); // March 31
          break;
        case 'rolling':
          endDate = today;
          startDate = new Date(today);
          startDate.setFullYear(today.getFullYear() - 1);
          break;
      }

      // Fetch data from all accident tables
      const tables = [
        'accidents_dangerousoccurrence',
        'accidents_fatality',
        'accidents_hospitaltreatment',
        'accidents_illhealth',
        'accidents_minoraccident',
        'accidents_nonfatal',
        'accidents_occupationaldisease',
        'accidents_personalinjury',
        'accidents_sevendayincapacitation',
        'accidents_specifiedinjuries',
        'accidents_nearmiss',
        'accidents_environmental',
        'accidents_propertydamage',
        'accidents_unsafeactions',
        'accidents_unsafeconditions',
        'accidents_utilitydamage'
      ];

      const allData = await Promise.all(
        tables.map(async (table) => {
          const { data, error } = await supabase
            .from(table)
            .select('incident_date')
            .gte('incident_date', startDate.toISOString())
            .lte('incident_date', endDate.toISOString());

          if (error) throw error;
          return {
            type: table.replace('accidents_', ''),
            count: data?.length || 0
          };
        })
      );

      setData(allData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadChart = () => {
    const chartElement = document.querySelector('.chart-container');
    if (chartElement) {
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      // Set canvas dimensions with extra space for logo and title
      const element = chartElement as HTMLElement;
      canvas.width = element.offsetWidth;
      canvas.height = element.offsetHeight + 100; // Extra space for logo and title
      
      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Function to add logo and title
      const addLogoAndTitle = (callback: () => void) => {
        if (companyLogo) {
          const logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          logoImg.onload = () => {
            // Calculate logo dimensions maintaining aspect ratio
            const maxLogoSize = 80;
            const logoAspectRatio = logoImg.width / logoImg.height;
            
            let logoWidth, logoHeight;
            if (logoAspectRatio > 1) {
              // Wider than tall - constrain width
              logoWidth = maxLogoSize;
              logoHeight = maxLogoSize / logoAspectRatio;
            } else {
              // Taller than wide - constrain height
              logoHeight = maxLogoSize;
              logoWidth = maxLogoSize * logoAspectRatio;
            }
            
            // Draw logo in top-left corner with proper aspect ratio
            ctx.drawImage(logoImg, 20, 20, logoWidth, logoHeight);
            
            // Add title next to logo with proper spacing
            const titleX = 20 + logoWidth + 20; // 20px margin after logo
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 24px Arial';
            ctx.fillText('Annual Accident Statistics Report', titleX, 45);
            
            // Add timestamp
            ctx.font = '14px Arial';
            ctx.fillStyle = '#666666';
            const timestamp = new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            ctx.fillText(`Generated: ${timestamp}`, titleX, 65);
            
            callback();
          };
          logoImg.onerror = () => {
            // If logo fails to load, just add title
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 24px Arial';
            ctx.fillText('Annual Accident Statistics Report', 20, 45);
            
            ctx.font = '14px Arial';
            ctx.fillStyle = '#666666';
            const timestamp = new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            ctx.fillText(`Generated: ${timestamp}`, 20, 65);
            
            callback();
          };
          logoImg.src = companyLogo;
        } else {
          // No logo, just add title
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 24px Arial';
          ctx.fillText('Annual Accident Statistics Report', 20, 45);
          
          ctx.font = '14px Arial';
          ctx.fillStyle = '#666666';
          const timestamp = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          ctx.fillText(`Generated: ${timestamp}`, 20, 65);
          
          callback();
        }
      };
      
      // Convert SVG to canvas and add to main canvas
      const svgElements = chartElement.querySelectorAll('svg');
      if (svgElements.length > 0) {
        const svgData = new XMLSerializer().serializeToString(svgElements[0]);
        const img = new Image();
        const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
          // Draw chart below logo/title area
          ctx.drawImage(img, 0, 100);
          
          // Add logo and title
          addLogoAndTitle(() => {
            // Download as JPG
            canvas.toBlob((blob) => {
              if (blob) {
                const link = document.createElement('a');
                link.download = `accidents-annual-stats-${new Date().toISOString().split('T')[0]}.jpg`;
                link.href = URL.createObjectURL(blob);
                link.click();
                URL.revokeObjectURL(url);
              }
            }, 'image/jpeg', 0.9);
          });
        };
        
        img.src = url;
      }
    }
  };

  return (
    <div className="container mx-auto px-4">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-white mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-gray-200"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Accidents
        </button>
       
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Annual Statistics</h2>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        {/* View Type Toggle - Only show on larger screens */}
        <div className="flex items-center space-x-2 lg:flex hidden">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View:</span>
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewType('pie')}
              className={`px-3 py-1 text-sm font-medium rounded-l-md ${
                viewType === 'pie'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <PieChart className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewType('line')}
              className={`px-3 py-1 text-sm font-medium ${
                viewType === 'line'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <LineChart className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewType('bar')}
              className={`px-3 py-1 text-sm font-medium ${
                viewType === 'bar'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <BarChart className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewType('table')}
              className={`px-3 py-1 text-sm font-medium rounded-r-md ${
                viewType === 'table'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <Table className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Period Type Toggle */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Period:</span>
          <select
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as PeriodType)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="calendar">Calendar Year</option>
            <option value="fiscal">Fiscal Year</option>
            <option value="rolling">Rolling 12 Months</option>
          </select>
        </div>

        {/* Chart Controls - Only show for chart views */}
        {viewType !== 'table' && !loading && (
          <div className="flex items-center space-x-2 ml-auto">
            <button
              onClick={() => {
                setZoomLevel(prev => Math.max(0.5, prev - 0.2));
                setPosition({ x: 0, y: 0 });
              }}
              className="px-3 py-1 text-sm font-medium rounded-md bg-gray-100 hover:bg-gray-200 shadow-md dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white"
            >
              Zoom Out
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.2))}
              className="px-3 py-1 text-sm font-medium rounded-md bg-gray-100 hover:bg-gray-200 shadow-md dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white"
            >
              Zoom In
            </button>
            <button
              onClick={downloadChart}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Download JPG
            </button>
          </div>
        )}
      </div>

      {/* Main Content Section */}
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg">
        <div className="p-6">
          {/* Data Display */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Loading data...</p>
            </div>
          ) : (
            <div className={`${window.innerWidth >= 1024 ? 'h-[36rem]' : 'h-96'} overflow-auto`}>
              {viewType === 'pie' && (
                <div className="h-full flex flex-col items-center justify-center relative chart-container">
                  <div 
                    className="w-full flex flex-col lg:block relative overflow-hidden" 
                    style={{ 
                      height: '500px',
                      minHeight: '500px',
                      position: 'relative'
                    }}
                  >
                    <div
                      className="cursor-move absolute inset-0"
                      style={{ 
                        transform: `scale(${zoomLevel}) translate(${position.x}px, ${position.y}px)`,
                        transformOrigin: 'center center',
                      }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                    >
                      <ResponsivePie
                        data={data.map(item => ({
                          id: item.type,
                          label: item.type,
                          value: item.count
                        }))}
                        margin={{ 
                          top: 40, 
                          right: window.innerWidth >= 1024 ? 320 : 40,
                          bottom: 140,
                          left: 40
                        }}
                        innerRadius={0.5}
                        padAngle={1}
                        cornerRadius={3}
                        colors={{ scheme: 'paired' }}
                        borderWidth={1}
                        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                        enableArcLabels={false}
                        arcLinkLabelsOffset={10}
                        arcLinkLabelsDiagonalLength={20}
                        arcLinkLabelsSkipAngle={10}
                        arcLinkLabelsTextColor="#333333"
                        arcLinkLabelsThickness={2}
                        arcLinkLabelsColor={{ from: 'color' }}
                        legends={[
                          {
                            anchor: window.innerWidth >= 1024 ? 'right' : 'bottom',
                            direction: window.innerWidth >= 1024 ? 'column' : 'row',
                            justify: false,
                            translateX: window.innerWidth >= 1024 ? 280 : 0,
                            translateY: window.innerWidth >= 1024 ? 0 : 100,
                            itemsSpacing: 8,
                            itemWidth: 260,
                            itemHeight: 24,
                            itemTextColor: '#555',
                            itemDirection: 'left-to-right',
                            symbolSize: 16,
                            symbolShape: 'circle',
                            effects: [
                              {
                                on: 'hover',
                                style: {
                                  itemTextColor: '#000'
                                }
                              }
                            ],
                            wrap: true
                          }
                        ]}
                        tooltip={({ datum }) => (
                          <div style={{ padding: 8, background: '#fff', border: '1px solid #ccc' }}>
                            <strong>{datum.id}</strong>: {datum.value} ({datum.formattedValue} / {(datum.data?.percent || 0).toFixed(1)}%)
                          </div>
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}
              {viewType === 'line' && (
                <div className="h-full flex flex-col items-center justify-center relative chart-container">
                  <div 
                    className="w-full flex flex-col lg:block relative overflow-hidden" 
                    style={{ 
                      height: '500px',
                      minHeight: '500px',
                      position: 'relative'
                    }}
                  >
                    <ResponsiveLine
                      data={[
                        {
                          id: 'accidents',
                          data: data.map(item => ({
                            x: item.type,
                            y: item.count
                          }))
                        }
                      ]}
                      margin={{ 
                        top: 40, 
                        right: window.innerWidth >= 1024 ? 320 : 40,
                        bottom: 140,
                        left: 60
                      }}
                      xScale={{
                        type: 'point'
                      }}
                      yScale={{
                        type: 'linear',
                        min: 0,
                        max: 'auto',
                        stacked: false,
                        round: true
                      }}
                      curve="monotoneX"
                      axisTop={null}
                      axisRight={null}
                      axisBottom={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: -45,
                        legend: 'Type',
                        legendOffset: 100,
                        legendPosition: 'middle'
                      }}
                      axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Count',
                        legendOffset: -50,
                        legendPosition: 'middle',
                        format: (value) => Math.floor(value)
                      }}
                      colors={{ scheme: 'paired' }}
                      pointSize={10}
                      pointColor={{ theme: 'background' }}
                      pointBorderWidth={2}
                      pointBorderColor={{ from: 'serieColor' }}
                      pointLabelYOffset={-12}
                      enableArea={true}
                      areaOpacity={0.15}
                      useMesh={true}
                      legends={[
                        {
                          anchor: window.innerWidth >= 1024 ? 'right' : 'bottom',
                          direction: window.innerWidth >= 1024 ? 'column' : 'row',
                          justify: false,
                          translateX: window.innerWidth >= 1024 ? 280 : 0,
                          translateY: window.innerWidth >= 1024 ? 0 : 100,
                          itemsSpacing: 8,
                          itemWidth: 260,
                          itemHeight: 24,
                          itemDirection: 'left-to-right',
                          itemTextColor: '#555',
                          symbolSize: 16,
                          symbolShape: 'circle',
                          effects: [
                            {
                              on: 'hover',
                              style: {
                                itemTextColor: '#000'
                              }
                            }
                          ]
                        }
                      ]}
                      tooltip={({ point }) => (
                        <div style={{ padding: 8, background: '#fff', border: '1px solid #ccc' }}>
                          <strong>{point.data.x}</strong>: {point.data.y}
                        </div>
                      )}
                    />
                  </div>
                </div>
              )}
              {viewType === 'bar' && (
                <div className="h-full flex flex-col items-center justify-center relative chart-container">
                  <div 
                    className="w-full flex flex-col lg:block relative overflow-hidden" 
                    style={{ 
                      height: '500px',
                      minHeight: '500px',
                      position: 'relative'
                    }}
                  >
                    <div
                      className="cursor-move absolute inset-0"
                      style={{ 
                        transform: `scale(${zoomLevel}) translate(${position.x}px, ${position.y}px)`,
                        transformOrigin: 'center center',
                      }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                    >
                      <ResponsiveBar
                        data={data.map(item => ({
                          type: item.type,
                          count: item.count
                        }))}
                        keys={['count']}
                        indexBy="type"
                        margin={{ 
                          top: 40, 
                          right: window.innerWidth >= 1024 ? 320 : 40,
                          bottom: 140,
                          left: 60
                        }}
                        padding={0.3}
                        valueScale={{ type: 'linear', round: true }}
                        indexScale={{ type: 'band', round: true }}
                        colors={{ scheme: 'paired' }}
                        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                        axisTop={null}
                        axisRight={null}
                        axisBottom={{
                          tickSize: 5,
                          tickPadding: 5,
                          tickRotation: -45,
                          legend: 'Type',
                          legendPosition: 'middle',
                          legendOffset: 100
                        }}
                        axisLeft={{
                          tickSize: 5,
                          tickPadding: 5,
                          tickRotation: 0,
                          legend: 'Count',
                          legendPosition: 'middle',
                          legendOffset: -50,
                          format: value => Math.floor(value)
                        }}
                        labelSkipWidth={12}
                        labelSkipHeight={12}
                        labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                        legends={[
                          {
                            anchor: window.innerWidth >= 1024 ? 'right' : 'bottom',
                            direction: window.innerWidth >= 1024 ? 'column' : 'row',
                            justify: false,
                            translateX: window.innerWidth >= 1024 ? 280 : 0,
                            translateY: window.innerWidth >= 1024 ? 0 : 100,
                            itemsSpacing: 8,
                            itemWidth: 260,
                            itemHeight: 24,
                            itemDirection: 'left-to-right',
                            itemTextColor: '#555',
                            symbolSize: 16,
                            symbolShape: 'circle',
                            effects: [
                              {
                                on: 'hover',
                                style: {
                                  itemTextColor: '#000'
                                }
                              }
                            ]
                          }
                        ]}
                        tooltip={({ value, indexValue }) => (
                          <div style={{ padding: 8, background: '#fff', border: '1px solid #ccc' }}>
                            <strong>{indexValue}</strong>: {value}
                          </div>
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}
              {viewType === 'table' && (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Count
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-left">
                          {item.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-left">
                          {item.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
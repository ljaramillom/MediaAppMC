import { Component, effect, inject, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { ReportStore } from '../../store/report.store';
import { Chart, ChartType } from 'chart.js/auto';
import { ConsultService } from '../../services/consult.service';
import { PdfViewerModule } from 'ng2-pdf-viewer';

@Component({
  imports: [
    MatButtonModule,
    MatDividerModule,
    PdfViewerModule
  ],
  selector: 'app-report',
  styleUrl: './report.component.css',
  templateUrl: './report.component.html',
  providers: [ ReportStore]
})
export class ReportComponent {
  private readonly reportStore = inject(ReportStore);
  private readonly consultService = inject(ConsultService);

  protected $chart = signal<Chart>(null);
  protected $chartType = signal<ChartType>('line');

  protected $chartData = this.reportStore.$chartData;
  protected $pdfSrc = signal<string>(null);

  constructor() {
    effect(() => {
      const data = this.$chartData();
      const type = this.$chartType();

      if(data && data.length > 0 && type) {
        this.renderChart(data, type);
      }
    });
  }

  private renderChart(data: any[], type: ChartType){
    const dates = data.map(item => item.consultdate);
    const quantities = data.map(item => item.quantity);

    untracked( ()=> {    
      const oldChart = this.$chart();
      if(oldChart) {
        oldChart.destroy();
      }

      const newChart = new Chart('canvas', {
              type: type,
              data: {
                labels: dates,
                datasets: [
                  {
                    label: 'Quantity',
                    data: quantities,
                    borderColor: '#3cba9f',
                    fill: false,
                    backgroundColor: [
                      'rgba(255, 99, 132, 0.2)',
                      'rgba(54, 162, 235, 0.2)',
                      'rgba(255, 206, 86, 0.2)',
                      'rgba(75, 192, 192, 0.2)',
                      'rgba(153, 102, 0, 0.2)',
                      'rgba(255, 159, 64, 0.2)',
                    ],
                    borderWidth: 1,
                  },
                ],
              },
              options: {
                scales: {
                  x: { display: true },
                  y: {
                    display: true,
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                  },
                },
              },
            });

            this.$chart.set(newChart);
        });
  }

  change(type: ChartType){
    this.$chartType.set(type);
  }

  //PDFS
  downloadReport(){
    this.consultService.generateReport().subscribe(data => {
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.setAttribute('style', 'display:none;');
      document.body.appendChild(a);
      a.href = url;
      a.download = 'report.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    });
  }

  viewReport(){
    this.consultService.generateReport().subscribe(data => {
      const url = window.URL.createObjectURL(data);
      this.$pdfSrc.set(url);
    });
  }
}

import { Component } from '@angular/core';
import * as echarts from 'echarts';
import { HttpClient } from '@angular/common/http';
export interface MapData {
  code: number,
  name?: string,
  center?: any
}
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent {
  mapData = [];
  baseMapData = [];
  baseGeoJson = [];
  geoJson = [];
  defaultZoom = 1;
  title = 'app';
  echartsMap: any;
  cityName: any;
  option: any;
  animationTime = 400;
  area :MapData= {
    code: 100000,
    name: '中国',
    center: undefined
  };
  checkArea: MapData;
  
  /**
   * 获取json文件
   * @param name 
   * @returns 
   */
  async getJson(name) {
    return new Promise(resolve => {
      this.http.get(`assets/map/${name}.geoJson`)
        .subscribe(data => {
          resolve(data);
        });
    });
  }
  /**
   * 回退到之前缩放状态
   */
  backParent() {
    const { code } = this.checkArea;
    if (code) {
      const areaCode = code.toString();
      this.option.geo.zoom = 0.5;
      setTimeout(() => {
        if (areaCode.endsWith('0000')) {
          this.checkArea = {
            code: this.area.code,
          };
          this.loadMapData(this.area.code, 'leave');
        } else if (areaCode.endsWith('00')) {
          const data = {
            code: Number(areaCode.substr(0, 2).padEnd(6, '0')),
            center: this.checkArea.center,
          };
          this.checkArea = data;
          this.loadMapData(data.code, 'leave');
        } else {
          const data = {
            code: Number(areaCode.substr(0, 4).padEnd(6, '0')),
            center: this.checkArea.center,
          };
          this.checkArea = data;
          this.loadMapData(data.code, 'leave');
        }
      }, this.animationTime);
    }
  }
  /**
   * 
   * @param areaCode 
   * @param type 
   */
  async loadMapData(areaCode, type?) {
    //创建一个实例
    let mapJsonStr;
    if (areaCode.toString().endsWith('0000')) {
      await this.getJson(areaCode).then(function (value) {
        mapJsonStr = value
      });
    } else if (areaCode.toString().endsWith('00')) {
      let name = `${areaCode
        .toString()
        .substr(0, 2)
        .padEnd(6, '0000')}/${areaCode}`;
      await this.getJson(name).then(function (value) {
        mapJsonStr = value
      });
    }
    if (mapJsonStr) {
      const mapJson = mapJsonStr;
      if (mapJson.features && mapJson.features.length) {
        const list = [];
        for (let i = 0; i < mapJson.features.length; i++) {
          const element = mapJson.features[i];
          const { properties } = element;
          this.mapData.push({
            name: properties.name,
            code: properties.adcode,
            center: properties.center,
          });
        }
      }
      if (areaCode === this.area.code) {
        this.baseMapData = this.mapData;
        this.baseGeoJson = mapJson;
      }
      const baseGeoJson = JSON.parse(
        JSON.stringify(type ? (type === 'enter' ? this.geoJson : this.baseGeoJson) : this.baseGeoJson)
      );
      if (areaCode !== this.area.code) {
        baseGeoJson.features.push(...mapJson.features);
        const index = baseGeoJson.features.findIndex((element) => element.properties.adcode === areaCode);
        if (index > -1) {
          baseGeoJson.features.splice(index, 1);
        }
      }
      if (this.checkArea && this.checkArea.name) {
        this.cityName = this.checkArea.name;
      }
      this.geoJson = baseGeoJson;
      this.loadMap(this.cityName, baseGeoJson);
    }
  }
  loadMap(mapName, data) {
    if (data) {
      // 重新设置地图
      echarts.registerMap(mapName, data);
      this.option = {
        geo: {
          show: true,
          map: this.cityName,
          roam: true,
          center: this.checkArea && this.checkArea.center ? this.checkArea.center : undefined,
          label: {
            show: false,
          },
          scaleLimit: {
            min: 1,
            max:1000
          },
          selectedMode: false,
          showLegendSymbol: false,
          zoom:this.defaultZoom,
          itemStyle: {
            color: '#123',
            areaColor: '#0051ad',
            borderColor: '#fff',
            borderWidth: 0.5,
          },
          blur: {},
        },
        series: [
          {
            name: '数据名称',
            type: 'map',
            geoIndex: 0,
            data: this.mapData,
          },
        ],
      };
      this.echartsMap.setOption(this.option);
    }
  }
  /**
   * 点击地域展开下一级地域
   * @param params 
   */
  mapClick(params) {
    const { data } = params;
    if (data && data.code.toString().endsWith('00')) {
      let _options = this.echartsMap.getOption();
      const zoom = _options.geo[0].zoom;
      this.defaultZoom = zoom
      setTimeout(() => {
        this.checkArea = data;
        this.loadMapData(data.code, 'enter');
      }, this.animationTime);
    }
  }
  constructor(
    private http: HttpClient
  ) { }
  ngOnInit(): void {
    this.echartsMap = echarts.init(document.getElementById('map'));
    this.echartsMap.on('georoam', params => {});
    this.echartsMap.on('click', (params) => {
      if (params.data.code) {
        this.mapClick(params);
      }
    });
    this.loadMapData(this.area.code);
  }
}

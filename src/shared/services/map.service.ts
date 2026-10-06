import axios from 'axios'

export interface Province {
  code: number
  codename: string
  division_type: string
  name: string
  phone_code: number
}

export interface Ward {
  code: number
  codename: string
  division_type: string
  name: string
  province_code: number
}

class MapService {
  private readonly baseUrl = 'https://provinces.open-api.vn/api'

  getProvinces = async () => {
    const { data } = await axios.get<Province[]>(`${this.baseUrl}/v2/p`)
    return data
  }

  getWards = async (provinceCode: number) => {
    const { data } = await axios.get<Ward[]>(`${this.baseUrl}/v2/w?province=${provinceCode}`)
    return data
  }
}

export const mapService = new MapService()

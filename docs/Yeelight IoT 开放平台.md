# Yeelight IoT 开放平台

# 1. 简介

Yeelight IoT 开放平台为 Yeelight 倾力打造的智能物联网平台，允许三方平台通过云云对接方式接入和控制 Yeelight 设备。

## 1. 技术方案

### 1. 设备控制

接入方控制端通过自己的云端跟 Yeelight 开放平台进行交互，Yeelight 开放平台、Yeelight APP 通过 IoT 云端控制设备。

### 2. 状态上报

被控设备响应云端指令并且上报状态信息至 IoT 云端，IoT 云端根据设备所属用户推送到开放平台和 Yeelight APP，开放平台收到消息后根据用户绑定信息，逐一进行推送。

![image.png](https://fe-resource.yeelight.com/toc-page/img/markdown/yeelight-iot-open-platform-1.png)

## 2. 合作价值

Yeelight 是全球领先的智能照明品牌，在智能交互、工业设计和灯光体验等方面不断打磨，持续定义照明行业的最高标准。Yeelight 拥有完整的智能家居照明产品线，产品系列辐射家装照明、台上照明、氛围照明以及智能照明控制，全球累计出货 2000 余万件，用户辐射近 200 个国家和地区，致力于通过高品质光环境的打造，让更多人享受到智能照明的便捷和乐趣。

畅享智能好光，从拥有一盏 Yeelight 好灯开始！

# 2. 快速接入

## 1. 准备操作

接入 Yeelight 开放平台，需要先申请 <a href="https://zhuanlan.zhihu.com/p/89020647" target="_blank">OAuth</a> 接入与开放平台接入（等待 1-5 个工作日，我们将会与您联系），具体方式为：

1. 发送邮件到 Yeelight 开放平台，说明公司信息与接入原因，以及接入所需的信息；
2. 在 <https://open-console.yeelight.com/> 中在线登记信息；

> 需要准备的信息包括：1.OAuth 回调的 redirect_uri；2.接收事件推送的 uri（如果不需要事件推送可以不提供）

## 2. OAuth 对接

Yeelight IoT 开放平台采用 <a href="https://zhuanlan.zhihu.com/p/89020647" target="_blank">OAuth 2.0</a> 进行授权，<a href="https://zhuanlan.zhihu.com/p/89020647" target="_blank">OAuth 2.0</a> 是目前最流行的授权机制，用来授权第三方应用，获取用户数据。
在回复邮件中我们会附带 OAuth 授权所需的 client_id 以及 client_secret 信息，如果你已经获得了这些信息那么我们开始吧。

### 1. 获取授权码

请求地址: _审核通过后会提供请求 URL_

请求方法: GET

- **请求参数:**

| 参数名称      | 必须 | 类型   | 备注                                                                                                              |
| ------------- | ---- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| client_id     | 是   | String | Yeelight 分配的应用 ID，可以联系管理员申请                                                                        |
| redirect_uri  | 是   | String | 回调地址, 必须和管理员给你添加应用时设置的一致(参数部分可不一致)                                                  |
| response_type | 是   | String | 描述获取授权的方式， 这里 response_type=code                                                                      |
| scope         | 否   | String | 申请的接口权限 ，可以传递多个，用空格分隔，目前未启用，可以填 read write                                          |
| state         | 否   | String | 随机字符串，授权请求成功后原样返回，该参数用于防止 CSRF 攻击，强烈建议传递该参数                                  |
| skip_confirm  | 否   | String | 默认值为 true，授权有效期内的用户在已登录情况下，不显示授权页面，直接通过。如果需要用户每次手动授权，设置为 false |

- **返回值:**
- 成功响应

如果授权成功，授权服务器会将用户的浏览器重定向到 ​redirect_uri​，并带上相关参数：

> <http://example.com/example?code=CODE&amp;state=STATE>

- 返回值说明：

| 参数名称 | 必须 | 类型   | 备注                                         |
| -------- | ---- | ------ | -------------------------------------------- |
| code     | 是   | String | 用来换取 access_token 的授权码，只能使用一次 |
| state    | 否   | String | 如果请求时传递参数，会回传该参数             |

- 失败响应

如果授权失败，授权服务器会将用户的浏览器重定向到 ​redirect_uri​，并带上相关参数：

> <http://example.com/example?error=ERROR&amp;error_description=ERROR_DESCRIPTION&amp;state=STATE>

- 返回值说明：

| 参数名称          | 必须 | 类型    | 备注                             |
| ----------------- | ---- | ------- | -------------------------------- |
| error             | 是   | Integer | 错误码见下方定义                 |
| error_description | 是   | String  | 错误描述信息                     |
| state             | 否   | String  | 如果请求时传递参数，会回传该参数 |

#### 相关错误码定义

| 错误 CODE | 错误信息                            | 详细描述                                                 |
| --------- | ----------------------------------- | -------------------------------------------------------- |
| 401       | invalid_client                      | 应用不存在, 或者 client_id 和 client_secret 不匹配       |
| 400       | invalid_request                     | 请求缺少必要参数，或者参数格式不正确                     |
| 403       | insufficient_scope                  | 资源服务器处理请求时令牌中的作用域不足                   |
| 400       | invalid_grant grant_type            | 无效, grant type 支持 token 或者 code                    |
| 401       | unauthorized_client                 | 客户端没有权限使用该请求, 需要申请相应权限               |
| 400       | unsupported_grant_type              | grant_type 不被授权服务器所支持                          |
| 400       | invalid_scope scope                 | 是无效的、未知的，或格式不正确的                         |
| 401       | invalid_token access_token          | 无效或已过期                                             |
| 400       | Invalid refresh token refresh_token | 无效或已经过期                                           |
| 400       | redirect_uri_mismatch               | 回调地址与注册的值不匹配或者不是一个合法的 URI           |
| 400       | unsupported_response_type           | 响应类型不被授权服务器所支持                             |
| 400       | access_denied                       | 用户或授权服务器拒绝了请求, 可能是用户取消了对应用的授权 |
| 400       | Invalid authorization code          | 授权码无效或已经过期, 授权码只能用一次                   |
| 400       | unauthorized_user                   | 无效的用户                                               |

### 2. 获取访问令牌

请求地址:  _审核通过后会提供请求 URL_

请求方法: POST

- **请求参数:**

| 参数名称      | 必须 | 类型   | 备注                                                                                                                                             |
| ------------- | ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| client_id     | 是   | String | Yeelight 分配的应用 ID，可以联系管理员申请                                                                                                       |
| redirect_uri  | 是   | String | 回调地址, 必须和管理员给你添加应用时设置的一致(参数部分可不一致)                                                                                 |
| client_secret | 是   | String | Yeelight 分配的应用秘钥，可以联系管理员申请                                                                                                      |
| grant_type    | 是   | String | 这里 grant_type=authorization_code                                                                                                               |
| code          | 是   | String | 授权码接口拿到的授权码，只能使用一次                                                                                                             |
| device        | 否   | String | 允许一个用户登录多个设备，且最多登录 10 个。改参数不传时，系统会随机生成一个。超出 10 个后，会按照授权时间，踢出最先授权的设备。强烈建议传该参数 |

- **返回值:**
- 成功响应

如果请求成功，授权服务器会返回 JSON 格式的字符串：

| 参数名称      | 必须 | 类型   | 备注                                                                        |
| ------------- | ---- | ------ | --------------------------------------------------------------------------- |
| access_token  | 是   | String | 访问令牌                                                                    |
| token_type    | 是   | String | token 类型                                                                  |
| refresh_token | 是   | String | 刷新令牌                                                                    |
| expires_in    | 是   | Long   | 访问令牌生命周期（单位：秒）                                                |
| scope         | 是   | String | 访问令牌实际权限范围                                                        |
| id            | 是   | Long   | 当前授权用户的 ID                                                           |
| region        | 是   | String | 当前授权用户的地域                                                          |
| device        | 是   | String | 当前授权的用户设备，请求参数中传了的话，会原样返回，否则返回 统会随机生成的 |
| client_id     | 是   | String | 当前授权应用的 ID                                                           |
| username      | 是   | String | 当前授权用户的用户名                                                        |
| jti           | 是   | String | jwt-token-id，token 的唯一属性                                              |

返回值示例：

```
{
  "access_token": "access token",  
  "token_type": "bearer",   
  "refresh_token": "refresh token",  
  "expires_in": 7775999,   
  "scope": "read write",  
  "id": 122349,   
  "region": "CN",   
  "device": "device",   
  "client_id": "client id",   
  "username": "username",   
  "jti": "jti value"
}
```

- 失败响应 1

如果请求失败，授权服务器会返回 JSON 格式的字符串：

| 参数名称          | 必须 | 类型    | 备注         |
| ----------------- | ---- | ------- | ------------ |
| error             | 是   | Integer | 错误码       |
| error_description | 是   | String  | 错误描述信息 |

返回值示例：

```
{
  "error": "error_code", 
  "error_description": "错误描述"
}
```

- 失败响应 2

如果请求失败，授权服务器会返回 JSON 格式的字符串：

| 参数名称 | 必须 | 类型    | 备注         |
| -------- | ---- | ------- | ------------ |
| success  | 是   | Boolean | true/false   |
| code     | 是   | String  | http code    |
| msg      | 是   | String  | 错误具体信息 |
| error    | 是   | String  | 错误信息     |
| data     | 是   | Object  | null         |

返回值示例：

```
{
  "requestId": "4180463424101195867",
  "payload": {
      /** 已省略 **/
  }
}
```

## 3. 开始调用

### 1. 协议简介

Yeelight 开放平台 api 统一使用 Post 请求，请求信息包括 Http Header、Http body 两部分。

1. Http Header：包含接入方标识、Oauth token、三方用户 id 信息

| 参数名        | 说明                                                        |
| ------------- | ----------------------------------------------------------- |
| authorization | 通过 Yeelight OAuth 获取的 token 值 eg: Bearer V3_3hF4q\*\* |
| key           | 接入开放平台时分配的接入方 key                              |
| unionId       | 三方用户标识，将使用该 id 进行事件通知                      |

2. Http Body：包含请求 id(requestId)、请求意图(intent)、请求参数信息(payload)，示例如下

```
{
  "inputs": [
    {
      "intent": "action.devices.*",
      "payload": {/** 已省略 **/}
    }
  ],
  "requestId": "4180463424101195867"
}
返回值：包括了请求时所传请求id(requestId)以及具体数据(payload){"requestId":"4180463424101195867","payload":{/** 已省略 **/}}
```

### 2. 开启智能之旅

首先，我们需要拉取设备列表；根据设备列表，我们可以下发控制命令，比如开灯；根据设备列表我们还可以查询设备的详细状态

#### 1. 拉取设备列表

编辑请求体：

```
{
    "requestId": "4180463424101195867",
    "inputs": [
        {
            "intent": "action.devices.SYNC"
        }
    ]
}
```

得到你的设备列表：

```
{
  "payload": {
    "agentUserId": "d0c01c1d-86e3-43c8-8e57-b1fa6fff4f0d",
    "devices": [
      {
        "attributes": {
          "temperatureMaxK": 6500,
          "temperatureMinK": 2700
        },
        "customData": {
          "localToken": "fd521f6f6af7749534c13d1afa9670f4",
          "gatewayId": 3492
        },
        "id": "2-4760",
        "name": {
          "deviceName": "落地灯"
        },
        "traits": [
          "action.devices.traits.OnOff",
          "action.devices.traits.Brightness",
          "action.devices.traits.ColorTemperature"
        ],
        "type": "action.devices.types.LIGHT",
        "willReportState": true
      },
      {
        "customData": {
          "localToken": "fd521f6f6af7749534c13d1afa9670f4",
          "gatewayId": 3492
        },
        "id": "2-7805",
        "name": {
          "deviceName": "客厅窗帘"
        },
        "traits": [
          "action.devices.traits.OpenClose"
        ],
        "type": "action.devices.types.CURTAIN",
        "willReportState": true
      },
      {
        "id": "6-199",
        "customData": {
          "localToken": "fd521f6f6af7749534c13d1afa9670f4",
          "gatewayId": 3492
        },
        "type": "action.devices.types.SCENE",
        "traits": [
          "action.devices.traits.Scene"
        ],
        "attributes": {
          "sceneReversible": false
        },
        "name": {
          "deviceName": "回家模式"
        },
        "willReportState": false
      }
    ]
  },
  "requestId": "b3f9b184-1e4a-40a1-852b-cddda05f30cc"
}
```

#### 2. 开灯

编辑请求体：

```
{
  "inputs": [
    {
      "context": {
        "locale_country": "US",
        "locale_language": "en"
      },
      "intent": "action.devices.EXECUTE",
      "payload": {
        "commands": [
          {
            "devices": [
              {
                "customData": {
                  "localToken": "fd521f6f6af7749534c13d1afa9670f4",
                  "gatewayId": 3492
                },
                "id": "2-4760"
              }
            ],
            "execution": [
              {
                "command": "action.devices.commands.OnOff",
                "params": {
                  "on": true
                }
              }
            ]
          }
        ]
      }
    }
  ],
  "requestId": "17227559985620946662"
}
```

操作结果：

```json
{
  "payload": {
    "commands": [
      {
        "ids": ["2-4760"],
        "states": {
          "on": true,
          "online": true
        },
        "status": "SUCCESS"
      }
    ]
  },
  "requestId": "17227559985620946662"
}
```

#### 3. 验证设备状态

编辑请求体：

```JSON
{

  "inputs": [
    {
      "intent": "action.devices.QUERY",
      "payload": {
        "devices": [
          {
            "customData": {
              "localToken": "fd521f6f6af7749534c13d1afa9670f4",
              "gatewayId": 3492
            },
            "id": "2-4760"
          }
        ]
      }
    }
  ],
  "requestId": "1339905472081167281"
}
```

操作结果：

```json
{
  "payload": {
    "devices": {
      "2-8014": {
        "brightness": 55,
        "color": {
          "temperature": 6500
        },
        "on": true,
        "online": true
      }
    }
  },
  "requestId": "1339905472081167281"
}
```

### 3. 概念

#### 用户意图

我们对用户行为按照意图进行了归类，包括：设备同步、设备查询、设备控制、账号解绑

#### 设备类型

我们对设备进行了归类，灯/灯组、窗帘、开关、风扇、情景。

- 灯：我们将吸顶灯、台灯、落地灯等各类灯具统一归纳为灯，然后通过设备特征进行二次归类。
- 窗帘：除了灯我们还支持了智能窗帘，智能窗帘通过智能窗帘电机来进行控制。
- 开关：智能家居中的基本设备，可以打开和关闭。
- 风扇：风扇通常可以打开和关闭，并具有速度设置。
- 情景：情景是一个抽象设备。通过 App 我们可以将一些复杂指令抽象为情景，这样我们只需要应用情景就可以完成一系列操作。比如：您可以自定义一个晚安模式：关掉卧室、客厅的所有灯，然后开启一盏小夜灯

#### 设备特征

设备类型的分类过于宽泛，但我们讲设备的特征加以了归纳，通过特征的组合我们实现了设备的二次分类。当前支持的设备特征包括：开关、亮度、色温、色彩、开合、情景。

- 开关：绝大多数设备都会支持开关，此处并非物理的开关，而是软开、软关，即：非物理断电，仅通过软件控制实现类似物理开关的功能；
- 亮度：针对可调亮度的灯具，可以进行亮度的调节。Yeelight 几乎所有的灯具都支持亮度调节；色温：针对支持色温的灯具，可以进行色温调节。如：支持冷暖光的吸顶灯；
- 色温：针对支持色温的灯具，可以进行色温调节。如：支持冷暖光的吸顶灯；
- 色彩：针对支持色彩的灯具，可以进行色彩调节。如：彩光灯带；
- 开合：针对支持开、关中间状态的设备，可以进行开合度的调节。如：窗帘
- 风速：针对支持调节风速的设备，如：风扇
- 情景：仅针对设备类型-情景，可以支持情景的应用

#### 设备指令

针对设备特征，我们定义了每个特征支持的指令，指令包含：开关、设置亮度绝对值、增加亮度、降低亮度、设置色彩/色温绝对值、开合、风速、应用情景

#### 设备属性

针对设备特征，我们定义了属性，用于标识设备状态，包括：开关、亮度、色温、色彩、风速、开启比例

# 3. 接口文档

此处我们列举了我们当前支持的所有接口，如果这并不能完全满足您的需求，请邮件与我们联系

## 1. 设备发现

设备发现只需简单的发送 action.devices.SYNC 请求即可获取到所有的设备、场景信息。

- 请求示例：

```
{
    "requestId": "4180463424101195867",
    "inputs": [
        {
            "intent": "action.devices.SYNC"
        }
    ]
}
```

- 参数说明：

| 参数      | 类型   | 说明                        |
| --------- | ------ | --------------------------- |
| requestId | String | 请求 id，用于日志跟踪       |
| intent    | String | 固定值：action.devices.SYNC |

- 返回示例：

```
{
  "payload": {
    "agentUserId": "d0c01c1d-86e3-43c8-8e57-b1fa6fff4f0d",
    "devices": [
      {
        "attributes": {
          "temperatureMaxK": 6500,
          "temperatureMinK": 2700
        },
        "customData": {
          "localToken": "fd521f6f6af7749534c13d1afa9670f4",
          "gatewayId": 3492
        },
        "id": "2-4760",
        "name": {
          "deviceName": "落地灯"
        },
        "traits": [
          "action.devices.traits.OnOff",
          "action.devices.traits.Brightness",
          "action.devices.traits.ColorTemperature"
        ],
        "type": "action.devices.types.LIGHT",
        "willReportState": true
      },
      {
        "customData": {
          "localToken": "fd521f6f6af7749534c13d1afa9670f4",
          "gatewayId": 3492
        },
        "id": "2-7805",
        "name": {
          "deviceName": "客厅窗帘"
        },
        "traits": [
          "action.devices.traits.OpenClose"
        ],
        "type": "action.devices.types.CURTAIN",
        "willReportState": true
      },
      {
        "id": "6-199",
        "customData": {
          "localToken": "fd521f6f6af7749534c13d1afa9670f4",
          "gatewayId": 3492
        },
        "type": "action.devices.types.SCENE",
        "traits": [
          "action.devices.traits.Scene"
        ],
        "attributes": {
          "sceneReversible": false
        },
        "name": {
          "deviceName": "回家模式"
        },
        "willReportState": false
      }
    ]
  },
  "requestId": "b3f9b184-1e4a-40a1-852b-cddda05f30cc"
}
```

- 返回值说明

| 参数                               | 类型    | 说明                            |
| ---------------------------------- | ------- | ------------------------------- |
| requestId                          | String  | 请求时所传 requestId            |
| payload                            | Object  | 数据体                          |
| agentUserId                        | String  | 请求头中 unionId                |
| devices                            | Array   | 设备列表                        |
| devices.id                         | String  | 设备唯一标识                    |
| devices.type                       | String  | 设备类型                        |
| devices.traits                     | Array   | 设备特性列表                    |
| devices.name.deviceName            | String  | 设备名称                        |
| devices.willReportState            | Boolean | 是否会上报状态变更              |
| devices.attributes                 | Object  | 设备属性参数信息                |
| devices.attributes.temperatureMaxK | Integer | 色温最大值                      |
| devices.attributes.temperatureMinK | Integer | 色温最小值                      |
| devices.attributes.sceneReversible | Boolean | 场景是否可撤销                  |
| devices.customData                 | Object  | 扩展信息，进行查询/控制时需携带 |
| devices.customData.localToken      | String  | 本地控制使用                    |
| devices.customData.gatewayId       | Long    | 设备所属网关 id                 |

## 2. 设备控制

根据发现的设备发送 action.devices.EXECUTE 指令。

- 请求示例：

```
{
  "inputs": [
    {
      "context": {
        "locale_country": "US",
        "locale_language": "en"
      },
      "intent": "action.devices.EXECUTE",
      "payload": {
        "commands": [
          {
            "devices": [
              {
                "customData": {
                  "localToken": "fd521f6f6af7749534c13d1afa9670f4",
                  "gatewayId": 3492
                },
                "id": "2-9158"
              }
            ],
            "execution": [
              {
                "command": "action.devices.commands.OnOff",
                "params": {
                  "on": true
                }
              }
            ]
          }
        ]
      }
    }
  ],
  "requestId": "17227559985620946662"
}
```

- 参数说明：

| 参数               | 类型   | 说明                                                             |
| ------------------ | ------ | ---------------------------------------------------------------- |
| requestId          | String | 请求 id，用于日志跟踪                                            |
| intent             | String | 固定值：action.devices.EXECUTE                                   |
| context            | Object | 上下文信息                                                       |
| payload            | Object | 负载信息                                                         |
| commands           | Array  | 命令信息                                                         |
| devices            | Array  | 设备列表                                                         |
| devices.customData | Object | 设备扩展信息，设备发现时下发，需原样携带                         |
| devices.id         | String | 设备标识                                                         |
| execution          | Array  | 执行信息，每次控制只有一个执行信息                               |
| execution.command  | String | 设备指令 execution.paramsMap 指令参数，格式为 propertyName:value |

- 返回示例：

```
{
  "payload": {
    "commands": [
      {
        "ids": [
          "2-9158"
        ],
        "states": {
          "on": true,
          "online": true
        },
        "status": "SUCCESS"
      }
    ]
  },
  "requestId": "17227559985620946662"
}
```

- 返回值说明

| 参数             | 类型   | 说明                                                         |
| ---------------- | ------ | ------------------------------------------------------------ |
| requestId        | String | 请求时所传                                                   |
| requestIdpayload | Object | 数据体                                                       |
| commands         | Array  | 命令列表                                                     |
| commands.ids     | Array  | 设备标识列表                                                 |
| commands.states  | Map    | 设备最新状态，格式为 propertyName:valuecommands.statusString |

- 执行结果：

SUCCESS-成功具体控制 execution 部分示例如下：

### 1. 打开开关

```
"execution": [
  {
    "command": "action.devices.commands.OnOff",
    "params": {
      "on": true
    }
  }
]

```

### 2. 关闭开关

```
"execution": [
  {
    "command": "action.devices.commands.OnOff",
    "params": {
      "on": false
    }
  }
]
```

### 3. 设置亮度绝对值为 100（范围 1-100）

```
"execution": [
  {
    "command": "action.devices.commands.BrightnessAbsolute",
    "params": {
      "brightness": 100
    }
  }
]
```

### 4. 增加亮度

```
"execution": [
  {
    "command": "action.devices.commands.BrightnessIncrement"
  }
]
```

### 5. 降低亮度

```
"execution": [
  {
    "command": "action.devices.commands.BrightnessDecrement"
  }
]
```

### 6. 设置色彩为 16721680（RGB 的 10 进制表示形式，范围为 0-16777215）

```
"execution": [
  {
    "command": "action.devices.commands.ColorAbsolute",
    "params": {
      "color": {
        "spectrumRGB": 16721680
      }
    }
  }
]
```

### 7. 设置色温为 5000（色温单位为 k，范围为 2700-6500）

```
"execution": [
  {
    "command": "action.devices.commands.ColorAbsolute",
    "params": {
      "color": {
        "temperature": 5000
      }
    }
  }
]
```

### 8. 开启/关闭窗帘至 70%（范围为 0-100，0 代表完全关闭，100 代表完全开启）

```
"execution": [
  {
    "command": "action.devices.commands.OpenClose",
    "params": {
      "openPercent": 70
    }
  }
]
```

### 9. 设置风速为 1 档（风速分为三档，取值为 0、1、2）

```
"execution": [
  {
    "command": "action.devices.commands.FanSpeed",
    "params": {
        "fanSpeed":0
    }
  }
]
```

### 10.应用情景

```
"execution": [
  {
    "command": "action.devices.commands.ActivateScene"
  }
]
```

## 3. 状态查询

根据发现的设备发送 action.devices.QUERY 请求即可获取到设备的状态信息。

- 请求示例：

```
{
  "inputs": [
    {
      "intent": "action.devices.QUERY",
      "payload": {
        "devices": [
          {
            "customData": {
              "localToken": "fd521f6f6af7749534c13d1afa9670f4",
              "gatewayId": 3492
            },
            "id": "2-8014"
          }
        ]
      }
    }
  ],
  "requestId": "1339905472081167281"
}
```

- 参数说明：

| 参数               | 类型   | 说明                                                               |
| ------------------ | ------ | ------------------------------------------------------------------ |
| requestId          | String | 请求 id，用于日志跟踪                                              |
| intent             | String | 固定值：action.devices.QUERYpayloadObject 负载信息                 |
| devices            | Array  | 设备列表                                                           |
| devices.customData | Object | 设备扩展信息，设备发现时下发，需原样携带 devices.idString 设备标识 |

- 返回示例：

```
{
  "payload": {
    "devices": {
      "2-8014": {
        "brightness": 55,
        "color": {
          "temperature": 6500
        },
        "on": false,
        "online": true
      }
    }
  },
  "requestId": "1339905472081167281"
}
```

- 返回值说明：

| 参数      | 类型   | 说明                                           |
| --------- | ------ | ---------------------------------------------- |
| requestId | String | 请求 id，用于日志跟踪                          |
| payload   | Object | 负载信息                                       |
| devices   | Map    | 设备列表，格式为 deviceId:{propertyName:value} |

## 4. 设备列表更新通知

设备列表发生变更会根据配置的链接发送推送消息到已接入的三方。

此部分暂未支持米系接入。

- 请求示例：

```
{
  "requestId": "1addfdc3-dd17-4eeb-90b1-57812812812b",
  "topic": "bind-device",
  "unionId": "12315"
}
```

- 参数说明：

| 参数      | 类型   | 说明                  |
| --------- | ------ | --------------------- |
| requestId | String | 请求 id，用于日志跟踪 |
| topic     | String | 固定值：bind-device   |
| unionId   | String | 三方用户标识          |

## 5. 设备状态更新通知

设备状态发生变更会根据配置的链接发送推送消息到已接入的三方。

此部分暂未支持米系接入。

- 消息示例：

```
{
  "properties": [
    {
      "id": "2-9158",
      "property": "on",
      "value": true
    },
    {
      "id": "2-9158",
      "property": "color-temperature",
      "value": 6500
    },
    {
      "id": "2-9158",
      "property": "brightness",
      "value": 58
    }
  ],
  "requestId": "04020189-1e21-48aa-935a-307dc9cd182b",
  "topic": "properties-changed",
  "unionId": "12315"
}
```

- 参数说明：

| 参数                | 类型   | 说明                       |
| ------------------- | ------ | -------------------------- |
| requestId           | String | 请求 id，用于日志跟踪      |
| topic               | String | 固定值：properties-changed |
| unionId             | String | 三方用户标识               |
| properties          | Array  | 属性列表                   |
| properties.id       | String | 设备标识                   |
| properties.property | String | 属性名称                   |
| properties.value    | Object | 属性值                     |

## 6. 设备上下线通知

设备上下线会根据配置的链接发送推送消息到已接入的三方。

此部分暂未支持米系接入。

- 请求示例：

```
{
  "devices": [
    {
      "id": "2-9158",
      "online": true
    }
  ],
  "requestId": "e58c71e8-8b36-4121-a29b-16b4e3e288cb",
  "topic": "devices-status-changed",
  "unionId": "12315"
}

```

- 参数说明：

| 参数           | 类型    | 说明                                                             |
| -------------- | ------- | ---------------------------------------------------------------- |
| requestId      | String  | 请求 id，用于日志跟踪 topicString 固定值：devices-status-changed |
| unionId        | String  | 三方用户标识                                                     |
| devices        | Array   | 设备列表                                                         |
| devices.id     | String  | 设备标识                                                         |
| devices.online | Boolean | 当前是否在线                                                     |

# 4. 更多资料

## 1. 设备类型

Yeelight IoT 开放平台支持的设备信息一览

| 设备类型                     | 设备描述 | 可支持的设备特征                                                                                                                                 |
| ---------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| action.devices.types.LIGHT   | 灯       | action.devices.traits.OnOff<br>action.devices.traits.Brightness<br>action.devices.traits.ColorTemperature<br>action.devices.traits.ColorSpectrum |
| action.devices.types.CURTAIN | 窗帘电机 | action.devices.traits.OpenClose                                                                                                                  |
| action.devices.types.SCENE   | 情景     | action.devices.traits.Scene                                                                                                                      |
| action.devices.types.SWITCH  | 开关     | action.devices.traits.OnOff                                                                                                                      |
| action.devices.types.FAN     | 风扇     | action.devices.traits.OnOff action.devices.traits.FanSpeed                                                                                       |

## 2. 设备特征

Yeelight IoT 开放平台支持的设备特征一览

| 特征                                   | 描述 | 支持的控制指令                                                                                                                           | 可查询的属性      |
| -------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| action.devices.traits.OnOff            | 开关 | action.devices.commands.OnOff                                                                                                            | on                |
| action.devices.traits.Brightness       | 亮度 | action.devices.commands.BrightnessAbsolute<br>action.devices.commands.BrightnessIncrement<br>action.devices.commands.BrightnessDecrement | brightness        |
| action.devices.traits.ColorTemperature | 色温 | action.devices.commands.ColorAbsolute                                                                                                    | color-temperature |
| action.devices.traits.ColorSpectrum    | 色彩 | action.devices.commands.ColorAbsolute                                                                                                    | color             |
| action.devices.traits.OpenClose        | 开合 | action.devices.commands.OpenClose                                                                                                        | openPercent       |
| action.devices.traits.Scene            | 情景 | action.devices.commands.ActivateScene                                                                                                    | -                 |
| action.devices.traits.FanSpeed         | 风速 | action.devices.commands.FanSpeed                                                                                                         | fanSpeed          |

## 3. 参数说明

| 参数                         | 值                                          | 含义               |
| ---------------------------- | ------------------------------------------- | ------------------ |
| Intent（用户意图）           | action.devices.SYNC                         | 设备同步           |
|                              | action.devices.QUERY                        | 状态查询           |
|                              | action.devices.EXECUTE                      | 设备控制           |
|                              | action.devices.DISCONNECT                   | 账号解绑           |
| device.type（设备类型）      | action.devices.types.LIGHT                  | 灯                 |
|                              | action.devices.types.CURTAIN                | 窗帘电机           |
|                              | action.devices.types.SCENE                  | 情景               |
|                              | action.devices.types.SWITCH                 | 开关               |
|                              | action.devices.types.FAN                    | 风扇               |
| device.traits（设备特征）    | action.devices.traits.OnOff 开关            |                    |
|                              | action.devices.traits.Brightness            | 亮度调节           |
|                              | action.devices.traits.ColorTemperature      | 色温调节           |
|                              | action.devices.traits.ColorSpectrum         | 色彩调节           |
|                              | action.devices.traits.OpenClose             | 开合（支持百分比） |
|                              | action.devices.traits.Scene                 | 应用情景           |
|                              | action.devices.traits.FanSpeed              | 风速               |
| command（设备指令）          | action.devices.commands.OnOff               | 打开关闭           |
|                              | action.devices.commands.BrightnessAbsolute  | 指定亮度           |
|                              | action.devices.commands.BrightnessIncrement | 增加亮度           |
|                              | action.devices.commands.BrightnessDecrement | 减少亮度           |
|                              | action.devices.commands.ColorAbsolute       | 设置色彩/色温      |
|                              | action.devices.commands.ActivateScene       | 激活场景           |
|                              | action.devices.commands.OpenClose           | 开合               |
|                              | action.devices.commands.FanSpeed            | 风速               |
| params.{key}（设备属性）     | on                                          | 开关               |
|                              | brightness                                  | 亮度               |
|                              | color                                       | 色彩               |
|                              | color-temperature                           | 色彩               |
|                              | openPercent                                 | 开启比例           |
|                              | fanSpeed                                    | 风速               |
| report.topic（推送消息主题） | bind-device                                 | 设备绑定/解绑      |
|                              | devices-status-changed                      | 设备上下线         |
|                              | properties-changed                          | 设备状态变更       |
